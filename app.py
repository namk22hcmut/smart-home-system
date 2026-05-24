from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from config import config_by_name
from models import (
    db, User, House, Floor, Room, Device, Sensor, SensorData, DeviceHistory, 
    Alert, ThresholdConfig, AutomationRule, RuleCondition, Notification,
    UserRole, UserStatus, AccessLevel, UserHouseAccess, ActivityLog,
    DeviceActivityLog, DashboardStats, Schedule, AdafruitFeedMapping
)
from notification_service import NotificationService
from admin_service import AdminService
from datetime import datetime, timedelta
import os
import logging
import requests
import paho.mqtt.client as mqtt
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =====================================================
# SENSOR TYPE → UNIT MAPPING
# =====================================================

SENSOR_UNIT_MAPPING = {
    'temperature': '°C',
    'humidity': '%',
    'motion': 'boolean',
    'light': 'lux',
    'co2': 'ppm',
    'pressure': 'hPa',
    'other': ''
}

def get_sensor_unit(sensor_type):
    """Get unit for sensor type"""
    return SENSOR_UNIT_MAPPING.get(sensor_type, '')

# =====================================================
# JWT AUTHENTICATION HELPERS
# =====================================================

def generate_token(user_id, username):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=config_by_name.get('development').JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, config_by_name.get('development').JWT_SECRET, algorithm=config_by_name.get('development').JWT_ALGORITHM)
    return token

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, config_by_name.get('development').JWT_SECRET, algorithms=[config_by_name.get('development').JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'success': False, 'error': 'Invalid authorization header'}), 401
        
        if not token:
            return jsonify({'success': False, 'error': 'Missing authentication token'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        # Get user role from database
        user = User.query.get(request.user_id)
        request.user_role = user.role.value if user else 'user'
        
        return f(*args, **kwargs)
    
    return decorated_function

def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check authentication
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'success': False, 'error': 'Invalid authorization header'}), 401
        
        if not token:
            return jsonify({'success': False, 'error': 'Missing authentication token'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        # Check if user is admin
        user = User.query.get(request.user_id)
        if not user or user.role != UserRole.ADMIN:
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        if user.status != UserStatus.ACTIVE:
            return jsonify({'success': False, 'error': 'User account is not active'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def log_activity(action, resource_type, resource_id=None, description=None, status='success'):
    """Log user activities for admin tracking"""
    try:
        user_id = getattr(request, 'user_id', None)
        ip_address = request.remote_addr
        
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            ip_address=ip_address,
            status=status
        )
        db.session.add(activity)
        db.session.commit()
        logger.info(f"📝 Activity logged: {action} on {resource_type} by user {user_id}")
    except Exception as e:
        logger.error(f"Error logging activity: {e}")

# =====================================================
# CREATE APP & DATABASE
# =====================================================

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, 'development'))
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        logger.info("✅ Database initialized")
    
    return app

app = create_app(os.getenv('FLASK_ENV', 'development'))

# Initialize SocketIO for real-time notifications
# Added support for multiple transports (WebSocket + polling fallback)
# Added CORS for local development IPs
socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8000",
        "http://10.0.106.239:8000",
        "http://10.0.106.239:8081",
        "http://10.0.185.222:8000",  # Development IP for Expo app
        "http://10.0.185.222:8081",
        "http://0.0.0.0:8000",
        "*"  # Allow all origins for development
    ],
    transports=['websocket', 'polling'],  # Fallback to polling if WebSocket fails
    allow_upgrades=True,  # Allow upgrade from polling to WebSocket
    ping_interval=60,  # Ping every 60 seconds
    ping_timeout=120   # Wait 120 seconds for pong response
)

# Dictionary to store connected users: {user_id: [socket_ids]}
connected_users = {}

# Enable CORS for all origins (allow web frontend to access API)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:8000", "http://10.0.106.239:8000", "http://10.0.106.239:8081"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True  # Allow credentials (cookies, auth headers)
    }
})

# =====================================================
# MQTT CLIENT & ADAFRUIT INTEGRATION
# =====================================================

ADAFRUIT_USERNAME = os.getenv('ADAFRUIT_USERNAME', '')
ADAFRUIT_KEY = os.getenv('ADAFRUIT_KEY', '')
ADAFRUIT_API_URL = 'https://io.adafruit.com/api/v2'

mqtt_client = mqtt.Client()

TARGET_HOUSE_ID = 1
TARGET_FLOOR_ID = 1
TARGET_ROOM_ID = 1

def _get_target_room():
    """Return the only room that exchanges data with Adafruit."""
    return (
        Room.query
        .join(Floor, Room.floor_id == Floor.floor_id)
        .filter(
            Floor.house_id == TARGET_HOUSE_ID,
            Floor.floor_id == TARGET_FLOOR_ID,
            Room.room_id == TARGET_ROOM_ID,
        )
        .first()
    )

def _is_target_room_id(room_id):
    try:
        return int(room_id) == TARGET_ROOM_ID
    except (TypeError, ValueError):
        return False

def _resolve_device_feed_key(device_type):
    if not device_type:
        return None
    device_type = str(device_type).strip().lower()
    if device_type == 'light':
        return 'home-led'
    if device_type == 'fan':
        return 'fan'
    return None

def _resolve_sensor_feed_key(sensor_type):
    if not sensor_type:
        return None
    sensor_type = str(sensor_type).strip().lower()
    if sensor_type in ['temperature', 'humidity', 'motion', 'light', 'co2', 'pressure']:
        return sensor_type
    return None

def _build_feed_name(room, entity_name):
    room_name = room.room_name if room else f"room_{TARGET_ROOM_ID}"
    return f"{room_name} {entity_name}".strip()

def _subscribe_target_feed_mappings(client):
    target_room = _get_target_room()
    if not target_room:
        logger.warning("⚠️ Target room house_id=1/floor_id=1/room_id=1 not found; no Adafruit subscriptions")
        return

    mappings = AdafruitFeedMapping.query.filter_by(
        room_id=target_room.room_id,
        is_active=True
    ).all()

    if not mappings:
        logger.warning("⚠️ No active target-room feed mappings found; not subscribing to wildcard")
        return

    for mapping in mappings:
        topic = f"{ADAFRUIT_USERNAME}/feeds/{mapping.feed_key}"
        client.subscribe(topic)
        logger.info(f"📡 Subscribed: {topic}")

def create_adafruit_feed(feed_key, feed_name):
    """Create a feed in Adafruit IO via REST API"""
    headers = {
        'X-AIO-Key': ADAFRUIT_KEY,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'name': feed_name,
        'key': feed_key
    }
    
    try:
        url = f'{ADAFRUIT_API_URL}/{ADAFRUIT_USERNAME}/feeds'
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 201:
            logger.info(f"✅ Adafruit feed created: {feed_key}")
            return feed_key
        elif 'already exists' in response.text.lower():
            logger.info(f"⚠️ Adafruit feed already exists: {feed_key}")
            return feed_key
        else:
            logger.warning(f"⚠️ Failed to create Adafruit feed {feed_key}: {response.status_code}")
            return feed_key
    except Exception as e:
        logger.error(f"❌ Error creating Adafruit feed {feed_key}: {e}")
        return feed_key

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("✅ Connected to Adafruit IO MQTT")
        
        # 🔥 Dynamic subscribe from database
        try:
            with app.app_context():
                _subscribe_target_feed_mappings(client)
        except Exception as e:
            logger.warning(f"⚠️ Subscribe error: {e}")
    else:
        logger.error(f"❌ MQTT connection failed with code {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    logger.info(f"📨 MQTT: {topic} = {payload}")
    
    # 🔥 IMPORTANT: Wrap with app context for database access
    with app.app_context():
        # Parse Adafruit topic: {USERNAME}/feeds/{FEED_KEY}
        try:
            parts = topic.split('/feeds/')
            if len(parts) == 2 and parts[0] == ADAFRUIT_USERNAME:
                # Extract feed_key
                feed_key = parts[1]
                logger.info(f"🔍 Feed key: {feed_key}")
                
                target_room = _get_target_room()
                if not target_room:
                    logger.warning("⚠️ Target room house_id=1/floor_id=1/room_id=1 not found; ignoring Adafruit message")
                    return

                # Only target room mappings are allowed to exchange data with Adafruit.
                mapping = AdafruitFeedMapping.query.filter_by(
                    feed_key=feed_key,
                    room_id=target_room.room_id,
                    is_active=True
                ).first()
                
                if not mapping:
                    logger.warning(f"⚠️ No target-room mapping found for feed: {feed_key}")
                    return
                
                logger.info(f"✅ Found mapping: {mapping.to_dict()}")
                
                # Process based on feed type
                try:
                    value = float(payload)
                except ValueError:
                    value = payload
                
                data_update = {}
                
                # Handle sensor data
                if mapping.feed_type == 'sensor' and mapping.sensor_id:
                    sensor = Sensor.query.get(mapping.sensor_id)
                    if sensor:
                        # Apply conversion factor
                        converted_value = value * mapping.conversion_factor if isinstance(value, (int, float)) else value
                        
                        sensor_data = SensorData(
                            sensor_id=mapping.sensor_id,
                            value=converted_value
                        )
                        db.session.add(sensor_data)
                        db.session.commit()
                        
                        data_update = {
                            'type': 'sensor',
                            'mapping_id': mapping.mapping_id,
                            'sensor_id': mapping.sensor_id,
                            'house_id': mapping.house_id,
                            'room_id': mapping.room_id,
                            'sensor_type': sensor.sensor_type,
                            'value': converted_value,
                            'unit': get_sensor_unit(sensor.sensor_type),
                            'timestamp': datetime.utcnow().isoformat()
                        }
                        logger.info(f"💾 Saved sensor data: {converted_value} for sensor {mapping.sensor_id}")
                
                # Handle device control
                elif mapping.feed_type == 'device' and mapping.device_id:
                    device = Device.query.get(mapping.device_id)
                    if device:
                        # Apply conversion based on data_key
                        if mapping.data_key == 'status':
                            # Status: "on"/"off" or 0/1
                            if isinstance(value, (int, float)):
                                new_status = 'on' if value > 0 else 'off'
                            else:
                                new_status = 'on' if str(payload).lower() in ['on', 'true', '1'] else 'off'
                            device.status = new_status
                            
                            data_update = {
                                'type': 'device',
                                'mapping_id': mapping.mapping_id,
                                'device_id': mapping.device_id,
                                'house_id': mapping.house_id,
                                'room_id': mapping.room_id,
                                'device_type': device.device_type,
                                'status': new_status,
                                'level': device.level,
                                'timestamp': datetime.utcnow().isoformat()
                            }
                            logger.info(f"💡 Device {mapping.device_id} status → {new_status}")
                        
                        elif mapping.data_key == 'level':
                            # Level: 0-100 (percentage)
                            converted_value = value * mapping.conversion_factor if isinstance(value, (int, float)) else 0
                            new_level = max(0, min(100, int(converted_value)))
                            device.level = new_level
                            device.status = 'on' if new_level > 0 else 'off'
                            
                            data_update = {
                                'type': 'device',
                                'mapping_id': mapping.mapping_id,
                                'device_id': mapping.device_id,
                                'house_id': mapping.house_id,
                                'room_id': mapping.room_id,
                                'device_type': device.device_type,
                                'status': device.status,
                                'level': new_level,
                                'timestamp': datetime.utcnow().isoformat()
                            }
                            logger.info(f"🔆 Device {mapping.device_id} level → {new_level}%")
                        
                        db.session.commit()
                
                # 🔥 Broadcast to all connected clients via Socket.IO
                if data_update:
                    try:
                        socketio.emit('realtime_update', data_update, to=None)
                        logger.info(f"📡 Broadcast: {data_update}")
                    except Exception as broadcast_error:
                        logger.warning(f"⚠️ Broadcast error (data still saved): {broadcast_error}")
                    
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}", exc_info=True)

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def publish_device_command(device_id, command_type, value):
    """
    Publish device control command to Adafruit IO via MQTT
    
    Args:
        device_id: Device ID to control
        command_type: 'status' (on/off) or 'level' (0-100)
        value: Command value ('on'/'off' for status, 0-100 for level)
    
    Returns:
        bool: True if published successfully
    """
    try:
        # Get device and mapping
        device = Device.query.get(device_id)
        if not device:
            logger.error(f"❌ Device not found: {device_id}")
            return False
        if not _is_target_room_id(device.room_id):
            logger.info(f"⏭️ Device {device_id} is outside target room; Adafruit publish skipped")
            return False
        
        # Find mapping for this device
        mapping = AdafruitFeedMapping.query.filter_by(
            device_id=device_id,
            room_id=TARGET_ROOM_ID,
            feed_type='device',
            is_active=True
        ).first()
        
        if not mapping:
            logger.warning(f"⚠️ No active mapping for device {device_id}")
            return False
        
        # Format MQTT topic using feed_key
        mqtt_topic = f"{ADAFRUIT_USERNAME}/feeds/{mapping.feed_key}"
        
        # Prepare payload
        if command_type == 'status':
            # Publish status (on/off → 1/0)
            payload = '1' if str(value).lower() in ['on', 'true', '1'] else '0'
            logger.info(f"📤 Publishing status: {mqtt_topic} = {payload}")
        elif command_type == 'level':
            # Publish level (0-100)
            level_value = max(0, min(100, int(value)))
            # Convert to device scale (if needed)
            payload = str(int(level_value / mapping.conversion_factor))
            logger.info(f"📤 Publishing level: {mqtt_topic} = {payload}")
        else:
            logger.error(f"❌ Unknown command type: {command_type}")
            return False
        
        # Publish to MQTT
        mqtt_client.publish(mqtt_topic, payload, qos=1)
        logger.info(f"✅ Command sent: {mqtt_topic} = {payload}")
        
        # Update local database
        device.status = 'on' if command_type == 'status' and str(value).lower() in ['on', 'true', '1'] else (
            'on' if command_type == 'level' and int(value) > 0 else device.status if command_type == 'level' else 'off'
        )
        
        if command_type == 'level':
            device.level = int(value)
        
        db.session.commit()
        return True
        
    except Exception as e:
        logger.error(f"❌ Error publishing command: {e}", exc_info=True)
        return False

# =====================================================
# PHASE 2: AUTO-CREATE & SYNC FUNCTIONS
# =====================================================

def sync_devices_to_adafruit():
    """Create Adafruit mappings only for house_id=1, floor_id=1, room_id=1."""
    logger.info("🔄 Starting sync_devices_to_adafruit() for target room only")
    
    try:
        with app.app_context():
            # Clear old mappings
            AdafruitFeedMapping.query.delete()
            db.session.commit()
            logger.info("🗑️ Cleared old feed mappings")

            target_room = _get_target_room()
            if not target_room:
                logger.error("❌ Target room house_id=1/floor_id=1/room_id=1 not found")
                return False

            house_id = target_room.floor.house_id if target_room.floor else TARGET_HOUSE_ID
            used_feed_keys = set()

            for sensor in target_room.sensors:
                feed_key = _resolve_sensor_feed_key(sensor.sensor_type)
                if not feed_key:
                    continue
                if feed_key in used_feed_keys:
                    logger.warning(f"⚠️ Duplicate target-room sensor feed skipped: {feed_key}")
                    continue

                feed_name = _build_feed_name(target_room, sensor.sensor_name)
                create_adafruit_feed(feed_key, feed_name)
                mapping = AdafruitFeedMapping(
                    feed_key=feed_key,
                    feed_name=feed_name,
                    sensor_id=sensor.sensor_id,
                    house_id=house_id,
                    room_id=target_room.room_id,
                    feed_type='sensor',
                    conversion_factor=1.0,
                    is_active=True
                )
                db.session.add(mapping)
                used_feed_keys.add(feed_key)
                logger.info(f"📡 Mapped target sensor: {feed_key} → sensor_id={sensor.sensor_id}")

            for device in target_room.devices:
                feed_key = _resolve_device_feed_key(device.device_type)
                if not feed_key:
                    continue
                if feed_key in used_feed_keys:
                    logger.warning(f"⚠️ Duplicate target-room device feed skipped: {feed_key}")
                    continue

                feed_name = _build_feed_name(target_room, device.device_name)
                create_adafruit_feed(feed_key, feed_name)
                mapping = AdafruitFeedMapping(
                    feed_key=feed_key,
                    feed_name=feed_name,
                    device_id=device.device_id,
                    house_id=house_id,
                    room_id=target_room.room_id,
                    feed_type='device',
                    data_key='level' if device.device_type == 'fan' else 'status',
                    conversion_factor=1.0,
                    is_active=True
                )
                db.session.add(mapping)
                used_feed_keys.add(feed_key)
                logger.info(f"📡 Mapped target device: {feed_key} → device_id={device.device_id}")
            
            db.session.commit()
            total_mappings = AdafruitFeedMapping.query.count()
            logger.info(f"✅ Sync complete! Created {total_mappings} total feed mappings")
            _subscribe_target_feed_mappings(mqtt_client)
            return True
            
    except Exception as e:
        logger.error(f"❌ Sync failed: {e}")
        db.session.rollback()
        return False

def simulate_sensor_data():
    """Generate local database data for non-target rooms only."""
    import random
    
    try:
        with app.app_context():
            sensors = Sensor.query.filter(Sensor.room_id != TARGET_ROOM_ID).all()
            for sensor in sensors:
                if sensor.sensor_type == 'temperature':
                    value = round(random.uniform(18, 35), 2)
                elif sensor.sensor_type == 'humidity':
                    value = round(random.uniform(30, 90), 2)
                elif sensor.sensor_type == 'co2':
                    value = round(random.uniform(350, 1200), 2)
                elif sensor.sensor_type == 'light':
                    value = round(random.uniform(0, 1200), 2)
                elif sensor.sensor_type == 'motion':
                    value = random.choice([0, 1])
                else:
                    value = round(random.uniform(0, 100), 2)

                db.session.add(SensorData(sensor_id=sensor.sensor_id, value=value))

            devices = Device.query.filter(Device.room_id != TARGET_ROOM_ID).all()
            for device in devices:
                if device.device_type == 'light':
                    device.status = random.choice(['on', 'off'])
                    device.level = 0
                else:
                    device.level = random.randint(0, 100)
                    device.status = 'on' if device.level > 0 else 'off'
                device.updated_at = datetime.utcnow()

            db.session.commit()
            logger.info(f"✅ Generated local DB data for {len(sensors)} sensors and {len(devices)} devices outside target room")
                    
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Simulation error: {e}")

try:
    mqtt_client.username_pw_set(ADAFRUIT_USERNAME, ADAFRUIT_KEY)
    mqtt_client.connect("io.adafruit.com", 1883, 60)
    mqtt_client.loop_start()
    logger.info("🔌 MQTT client started")
except Exception as e:
    logger.warning(f"⚠️ MQTT not available: {e}")

# =====================================================
# AUTOMATION CHECKER - Background Task
# =====================================================

import threading
from automation_service import AutomationService

def automation_checker():
    """Check automation rules every 30 seconds"""
    import time
    while True:
        try:
            # Need application context for database queries
            with app.app_context():
                AutomationService.check_all_rules()
        except Exception as e:
            logger.error(f"Error in automation checker: {e}")
        
        # Wait 30 seconds before checking again
        time.sleep(30)

def schedule_executor():
    """Execute device schedules every minute"""
    import time
    from datetime import datetime, timedelta
    
    while True:
        try:
            with app.app_context():
                now = datetime.now()
                current_time = now.time()
                current_day = now.weekday()  # 0=Monday, 6=Sunday
                
                # Get all active schedules
                schedules = Schedule.query.filter_by(is_active=True).all()
                
                for schedule in schedules:
                    # Check if today is in days_of_week
                    if schedule.days_of_week:
                        days = [int(d) for d in schedule.days_of_week.split(',')]
                        # Convert Python weekday (0=Mon) to ISO (0=Mon, but we use 0-6 for Sun-Sat)
                        # Adjust: 0=Sunday in our system, Python: 0=Monday
                        iso_day = (current_day + 1) % 7  # Convert to 0=Sunday
                        if iso_day not in days:
                            continue
                    
                    # **PART 1: Check for scheduled turn-on/off**
                    # Check if current time matches scheduled time (with 1-minute window)
                    time_diff = abs((datetime.combine(now.date(), schedule.scheduled_time) - 
                                   datetime.combine(now.date(), current_time)).total_seconds())
                    
                    if time_diff < 60 and not (
                        schedule.last_triggered_at and schedule.last_triggered_at.date() == now.date()
                    ):  # Within 1-minute window and not already triggered today

                        # Execute schedule
                        device = Device.query.get(schedule.device_id)
                        if device:
                            # Set device status
                            device.status = schedule.action_status
                            if device.device_type == 'fan' and schedule.action_status == 'on':
                                device.level = max(0, min(100, int(schedule.action_level or 0)))
                            else:
                                device.level = 0
                            schedule.last_triggered_at = now
                            
                            # If duration > 0, calculate auto-off time
                            if schedule.duration_minutes > 0 and schedule.action_status == 'on':
                                auto_off_at = now + timedelta(minutes=schedule.duration_minutes)
                                schedule.auto_off_at = auto_off_at
                                logger.info(f"⏱️ Device {device.device_name} will auto-off at {auto_off_at.strftime('%H:%M:%S')}")
                            else:
                                schedule.auto_off_at = None
                            
                            db.session.commit()

                            if _is_target_room_id(device.room_id):
                                if device.device_type == 'fan':
                                    publish_device_command(device.device_id, 'level', device.level)
                                else:
                                    publish_device_command(device.device_id, 'status', device.status)
                            
                            # Log activity
                            log = DeviceActivityLog(
                                device_id=schedule.device_id,
                                action='schedule_executed',
                                triggered_by='schedule',
                                reason=f'Schedule executed: {schedule.scheduled_time}',
                                schedule_id=schedule.schedule_id
                            )
                            db.session.add(log)
                            db.session.commit()
                            
                            # Create notification for device owner
                            device_room = Room.query.get(device.room_id)
                            if device_room:
                                floor = Floor.query.get(device_room.floor_id)
                                if floor:
                                    house = House.query.get(floor.house_id)
                                    if house:
                                        # Create notification for house owner
                                        notification = Notification(
                                            user_id=house.user_id,
                                            title='🔄 Schedule Executed',
                                            message=f'{device.device_name} turned {schedule.action_status.upper()} at {schedule.scheduled_time}',
                                            notification_type='schedule',
                                            is_read=False,
                                            data={
                                                'device_id': device.device_id,
                                                'schedule_id': schedule.schedule_id,
                                                'action': schedule.action_status,
                                                'level': schedule.action_level
                                            }
                                        )
                                        db.session.add(notification)
                                        db.session.commit()
                                        
                                        # Broadcast via WebSocket to connected user
                                        if house.user_id in connected_users:
                                            socketio.emit(
                                                'schedule_executed',
                                                {
                                                    'device_id': device.device_id,
                                                    'device_name': device.device_name,
                                                    'action': schedule.action_status,
                                                    'level': schedule.action_level,
                                                    'timestamp': now.isoformat(),
                                                    'duration': schedule.duration_minutes
                                                },
                                                room=[s for s in connected_users.get(house.user_id, [])],
                                                skip_sid=None
                                            )
                            
                            logger.info(f"✅ Schedule executed: Device {device.device_name} → {schedule.action_status}")
                    
                    # **PART 2: Check for auto-off (duration expiry)**
                    if schedule.auto_off_at and now >= schedule.auto_off_at:
                        # Time to auto-off
                        device = Device.query.get(schedule.device_id)
                        if device and device.status == 'on':
                            # Turn off device
                            device.status = 'off'
                            device.level = 0
                            schedule.auto_off_at = None  # Clear auto-off time
                            db.session.commit()

                            if _is_target_room_id(device.room_id):
                                if device.device_type == 'fan':
                                    publish_device_command(device.device_id, 'level', 0)
                                else:
                                    publish_device_command(device.device_id, 'status', 'off')
                            
                            # Log activity
                            log = DeviceActivityLog(
                                device_id=schedule.device_id,
                                action='schedule_auto_off',
                                triggered_by='schedule',
                                reason=f'Auto-off after {schedule.duration_minutes} minute(s)',
                                schedule_id=schedule.schedule_id
                            )
                            db.session.add(log)
                            db.session.commit()
                            
                            # Create notification
                            device_room = Room.query.get(device.room_id)
                            if device_room:
                                floor = Floor.query.get(device_room.floor_id)
                                if floor:
                                    house = House.query.get(floor.house_id)
                                    if house:
                                        notification = Notification(
                                            user_id=house.user_id,
                                            title='⏱️ Auto-Off Triggered',
                                            message=f'{device.device_name} auto-turned off after {schedule.duration_minutes} minute(s)',
                                            notification_type='auto_off',
                                            is_read=False,
                                            data={
                                                'device_id': device.device_id,
                                                'schedule_id': schedule.schedule_id
                                            }
                                        )
                                        db.session.add(notification)
                                        db.session.commit()
                                        
                                        # Broadcast via WebSocket
                                        if house.user_id in connected_users:
                                            socketio.emit(
                                                'schedule_auto_off',
                                                {
                                                    'device_id': device.device_id,
                                                    'device_name': device.device_name,
                                                    'timestamp': now.isoformat(),
                                                    'reason': f'After {schedule.duration_minutes} minute(s)'
                                                },
                                                room=[s for s in connected_users.get(house.user_id, [])],
                                                skip_sid=None
                                            )
                            
                            logger.info(f"🔴 Auto-off executed: Device {device.device_name}")
                
        except Exception as e:
            logger.error(f"Error in schedule executor: {e}")
        
        # Check every minute
        time.sleep(60)

# Note: Automation checker & Schedule executor threads will be started in main block after app initialization

# =====================================================
# SOCKETIO HANDLERS FOR REAL-TIME NOTIFICATIONS
# =====================================================

@socketio.on('connect')
def handle_connect():
    """User connects to WebSocket"""
    logger.info(f"🔗 Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """User disconnects from WebSocket"""
    logger.info(f"🔌 Client disconnected: {request.sid}")
    
    # Remove from connected users
    for user_id, socket_ids in list(connected_users.items()):
        if request.sid in socket_ids:
            socket_ids.remove(request.sid)
            if not socket_ids:
                del connected_users[user_id]
            logger.info(f"User {user_id} disconnected")

@socketio.on('auth')
def handle_auth(data):
    """Authenticate user with token"""
    token = data.get('token')
    payload = verify_token(token)
    
    if not payload:
        emit('auth_failed', {'error': 'Invalid token'})
        return
    
    user_id = payload['user_id']
    
    # Add to connected users
    if user_id not in connected_users:
        connected_users[user_id] = []
    connected_users[user_id].append(request.sid)
    
    logger.info(f"✅ User {user_id} authenticated on socket {request.sid}")
    emit('auth_success', {'user_id': user_id})

@socketio.on('subscribe_notifications')
def handle_subscribe(data):
    """Subscribe to notifications for a room (user_id)"""
    user_id = data.get('user_id')
    token = data.get('token')
    
    payload = verify_token(token)
    if not payload or payload['user_id'] != user_id:
        emit('error', {'error': 'Unauthorized'})
        return
    
    room = f"user_{user_id}"
    join_room(room)
    logger.info(f"✅ Socket {request.sid} subscribed to room {room}")
    emit('subscription_confirmed', {'room': room})

@socketio.on('get_notifications')
def handle_get_notifications(data):
    """Get all notifications for user"""
    user_id = data.get('user_id')
    token = data.get('token')
    
    payload = verify_token(token)
    if not payload or payload['user_id'] != user_id:
        emit('error', {'error': 'Unauthorized'})
        return
    
    notifications = NotificationService.get_user_notifications(user_id)
    unread_count = len([n for n in notifications if not n['is_read']])
    
    emit('notifications_list', {
        'notifications': notifications,
        'unread_count': unread_count,
        'total_count': len(notifications)
    })

# =====================================================
# REAL-TIME SENSOR & DEVICE UPDATES (via Adafruit MQTT)
# =====================================================

@socketio.on('subscribe_realtime')
def handle_subscribe_realtime(data):
    """Subscribe to real-time sensor/device updates"""
    token = data.get('token')
    payload = verify_token(token)
    
    if not payload:
        emit('error', {'error': 'Unauthorized'})
        return
    
    user_id = payload['user_id']
    room = f"realtime_user_{user_id}"
    join_room(room)
    
    logger.info(f"✅ User {user_id} subscribed to real-time updates")
    emit('realtime_subscribed', {'room': room})

@socketio.on('unsubscribe_realtime')
def handle_unsubscribe_realtime(data):
    """Unsubscribe from real-time updates"""
    token = data.get('token')
    payload = verify_token(token)
    
    if not payload:
        return
    
    user_id = payload['user_id']
    room = f"realtime_user_{user_id}"
    leave_room(room)
    
    logger.info(f"❌ User {user_id} unsubscribed from real-time updates")

# =====================================================
# API - NOTIFICATIONS
# =====================================================

@app.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    """Get all notifications for current user"""
    user_id = request.user_id
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    notifications = NotificationService.get_user_notifications(user_id, unread_only)
    unread_count = len([n for n in notifications if not n['is_read']])
    
    return jsonify({
        'success': True,
        'notifications': notifications,
        'unread_count': unread_count,
        'total_count': len(notifications)
    }), 200

@app.route('/api/notifications/<int:notification_id>', methods=['GET'])
@require_auth
def get_notification(notification_id):
    """Get a specific notification"""
    user_id = request.user_id
    
    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    return jsonify({'success': True, 'notification': notification.to_dict()}), 200

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@require_auth
def mark_notification_read(notification_id):
    """Mark notification as read"""
    user_id = request.user_id
    
    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    success = NotificationService.mark_as_read(notification_id)
    
    if success:
        # Emit event to all user's connected clients
        room = f"user_{user_id}"
        socketio.emit('notification_marked_read', {
            'notification_id': notification_id,
            'is_read': True,
            'read_at': datetime.utcnow().isoformat()
        }, room=room)
        
        return jsonify({'success': True, 'message': 'Notification marked as read'}), 200
    else:
        return jsonify({'success': False, 'error': 'Failed to mark as read'}), 500

@app.route('/api/notifications/clear-all', methods=['DELETE'])
@require_auth
def clear_all_notifications():
    """Clear all notifications for current user"""
    user_id = request.user_id
    
    try:
        Notification.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        # Emit event to all user's connected clients
        room = f"user_{user_id}"
        socketio.emit('notifications_cleared', {}, room=room)
        
        return jsonify({'success': True, 'message': 'All notifications cleared'}), 200
    except Exception as e:
        logger.error(f"Error clearing notifications: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id):
    """Delete a notification"""
    user_id = request.user_id
    print(f"🗑️ DELETE endpoint called: notification_id={notification_id}, user_id={user_id}")
    
    notification = Notification.query.get(notification_id)
    if not notification:
        print(f"❌ Notification not found: {notification_id}")
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    if notification.user_id != user_id:
        print(f"❌ Unauthorized: notification belongs to user {notification.user_id}, not {user_id}")
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    print(f"📤 Attempting to delete notification {notification_id}")
    success = NotificationService.delete_notification(notification_id)
    
    if success:
        print(f"✅ Notification {notification_id} deleted successfully")
        # Emit event to all user's connected clients
        room = f"user_{user_id}"
        socketio.emit('notification_deleted', {
            'notification_id': notification_id
        }, room=room)
        
        return jsonify({'success': True, 'message': 'Notification deleted'}), 200
    else:
        print(f"❌ Failed to delete notification {notification_id}")
        return jsonify({'success': False, 'error': 'Failed to delete'}), 500

# =====================================================
# HELPER FUNCTION: Notify user in real-time
# =====================================================

def emit_notification_to_user(user_id, notification_data):
    """Send notification to user via SocketIO"""
    room = f"user_{user_id}"
    socketio.emit('notification_received', notification_data, room=room)
    logger.info(f"📤 Emitted notification to {room}: {notification_data.get('title')}")

# =====================================================
# API - HEALTH CHECK
# =====================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend API is running'}), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({'api': 'Smart Home Backend', 'version': '1.0', 'status': 'operational'}), 200

# =====================================================
# API - AUTHENTICATION
# =====================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', '')
        
        if not username or not email or not password:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already exists'}), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already exists'}), 409
        
        # Create new user with hashed password
        password_hash = generate_password_hash(password)
        user = User(username=username, email=email, password_hash=password_hash, full_name=full_name)
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = generate_token(user.user_id, user.username)
        
        logger.info(f"✅ User registered: {username} (role: {user.role.value})")
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'user_id': user.user_id,
                'id': user.user_id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role.value,
                'status': user.status.value
            },
            'token': token
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Registration error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Missing username or password'}), 400
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
        
        # Verify password
        if not check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
        
        # Generate token
        token = generate_token(user.user_id, user.username)
        
        logger.info(f"✅ User logged in: {username} (role: {user.role.value})")
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'user_id': user.user_id,
                'id': user.user_id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role.value,
                'status': user.status.value
            },
            'token': token
        }), 200
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@require_auth
def verify_auth():
    """Verify if token is valid"""
    return jsonify({
        'success': True,
        'message': 'Token is valid',
        'user_id': request.user_id,
        'username': request.username
    }), 200

# =====================================================
# API - USERS
# =====================================================

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'data': [{'id': u.user_id, 'username': u.username, 'email': u.email} for u in users]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        user = User(username=data.get('username'), email=data.get('email'))
        db.session.add(user)
        db.session.commit()
        return jsonify({'success': True, 'id': user.user_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# =====================================================
# API - HOUSES
# =====================================================

@app.route('/api/houses', methods=['GET'])
@require_auth
def get_houses():
    try:
        # Get houses: all houses if admin, user's houses if regular user
        print(f"📍 get_houses called - user_id={request.user_id}, user_role={request.user_role}")
        if request.user_role == 'admin':
            houses = House.query.all()
            print(f"🏠 Admin request: found {len(houses)} houses")
        else:
            houses = House.query.filter_by(user_id=request.user_id).all()
            print(f"👤 User request: found {len(houses)} houses")
        
        return jsonify({
            'success': True,
            'data': [{'id': h.house_id, 'name': h.house_name, 'address': h.address, 'floors': len(h.floors)} for h in houses]
        }), 200
    except Exception as e:
        print(f"❌ Error in get_houses: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/houses', methods=['POST'])
@require_auth
def create_house():
    try:
        data = request.json
        house = House(
            user_id=request.user_id, 
            house_name=data.get('name'), 
            address=data.get('address'),
            city=data.get('city'),
            country=data.get('country')
        )
        db.session.add(house)
        db.session.commit()
        return jsonify({'success': True, 'id': house.house_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# =====================================================
# API - FLOORS
# =====================================================

@app.route('/api/houses/<int:house_id>/floors', methods=['GET'])
def get_floors(house_id):
    try:
        floors = Floor.query.filter_by(house_id=house_id).all()
        return jsonify({
            'success': True,
            'data': [{'id': f.floor_id, 'name': f.floor_name, 'floor_number': f.floor_number, 'rooms': len(f.rooms)} for f in floors]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/floors', methods=['POST'])
@require_auth
def create_floor():
    try:
        data = request.json
        floor_name = data.get('floor_name') or data.get('name')
        
        if not floor_name or not floor_name.strip():
            return jsonify({'success': False, 'error': 'Floor name is required'}), 400
        
        floor = Floor(
            house_id=data.get('house_id'), 
            floor_name=floor_name.strip(),
            floor_number=data.get('floor_number', 0),
            description=data.get('description')
        )
        db.session.add(floor)
        db.session.commit()
        return jsonify({'success': True, 'id': floor.floor_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# =====================================================
# API - ROOMS
# =====================================================

@app.route('/api/floors/<int:floor_id>/rooms', methods=['GET'])
def get_rooms(floor_id):
    try:
        rooms = Room.query.filter_by(floor_id=floor_id).all()
        return jsonify({
            'success': True,
            'data': [{'id': r.room_id, 'name': r.room_name, 'room_type': r.room_type, 'description': r.description, 'devices': len(r.devices), 'sensors': len(r.sensors)} for r in rooms]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rooms', methods=['POST'])
@require_auth
def create_room():
    try:
        data = request.json
        room_name = data.get('room_name') or data.get('name')
        
        if not room_name or not room_name.strip():
            return jsonify({'success': False, 'error': 'Room name is required'}), 400
        
        room = Room(
            floor_id=data.get('floor_id'), 
            room_name=room_name.strip(),
            room_type=data.get('room_type'),
            description=data.get('description'),
            area=data.get('area')
        )
        db.session.add(room)
        db.session.commit()
        return jsonify({'success': True, 'id': room.room_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# =====================================================
# API - DEVICES ⭐ WITH LEVEL
# =====================================================

@app.route('/api/rooms/<int:room_id>/devices', methods=['GET'])
def get_devices(room_id):
    try:
        devices = Device.query.filter_by(room_id=room_id).all()
        return jsonify({
            'success': True,
            'data': [{'device_id': d.device_id, 'device_name': d.device_name, 'device_type': d.device_type, 'status': d.status, 'level': d.level} for d in devices]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def list_devices():
    try:
        devices = Device.query.all()
        return jsonify({
            'success': True,
            'data': [{'device_id': d.device_id, 'device_name': d.device_name, 'device_type': d.device_type, 'status': d.status, 'level': d.level, 'room_id': d.room_id} for d in devices]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/devices/status', methods=['GET'])
def get_devices_status():
    """Get all devices with status and level"""
    try:
        devices = Device.query.all()
        return jsonify({
            'success': True,
            'data': [{'device_id': d.device_id, 'device_name': d.device_name, 'device_type': d.device_type, 'status': d.status, 'level': d.level, 'room_id': d.room_id} for d in devices]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/device-status', methods=['POST'])
def post_device_status():
    """Update device status and level ⭐"""
    try:
        data = request.json
        device_id = data.get('device_id')
        status = data.get('status')  # 'on' or 'off'
        level = data.get('level')  # 0-100
        
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        old_status = device.status
        old_level = device.level
        
        # Update status if provided
        if status:
            device.status = status
        
        # Only fans have a level. Other device types are status-only.
        if device.device_type != 'fan':
            device.level = 0
            level = 0
        elif level is not None:
            try:
                level = max(0, min(100, int(float(level))))
                device.level = level
                device.status = 'on' if level > 0 else 'off'
            except (TypeError, ValueError):
                level = old_level
        else:
            level = old_level
        
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log this activity (even for MQTT/external calls)
        log = DeviceActivityLog(
            device_id=device_id,
            action='set_level' if level != old_level else ('turn_on' if status == 'on' else 'turn_off'),
            old_status=old_status,
            new_status=device.status,
            old_level=old_level,
            new_level=device.level,
            triggered_by='mqtt' if not request.remote_addr else 'user',
            reason=f'Status changed from {old_status} to {device.status}, level {old_level} to {device.level}'
        )
        db.session.add(log)
        db.session.commit()
        
        logger.info(f"🔌 Device {device_id}: status={device.status}, level={device.level}")
        
        try:
            if _is_target_room_id(device.room_id):
                mapping = AdafruitFeedMapping.query.filter_by(
                    device_id=device_id,
                    room_id=TARGET_ROOM_ID,
                    feed_type='device',
                    is_active=True
                ).first()

                if mapping:
                    if mapping.data_key == 'status':
                        if status is not None and status != old_status:
                            publish_device_command(device_id, 'status', device.status)
                    elif mapping.data_key == 'level':
                        if level != old_level:
                            publish_device_command(device_id, 'level', device.level)
                    else:
                        logger.warning(f"⚠️ Unsupported device mapping data_key={mapping.data_key} for device {device_id}")
                else:
                    logger.warning(f"⚠️ No Adafruit mapping found for target-room device {device_id}")
        except Exception as publish_error:
            logger.warning(f"⚠️ Failed to publish device {device_id} to Adafruit: {publish_error}")

        return jsonify({'success': True, 'id': device_id, 'status': device.status, 'level': device.level}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/devices', methods=['POST'])
@require_auth
def create_device():
    try:
        data = request.json
        device_name = data.get('device_name')
        
        if not device_name or not device_name.strip():
            return jsonify({'success': False, 'error': 'Device name is required'}), 400
        
        device = Device(
            room_id=data.get('room_id'),
            device_name=device_name.strip(),
            device_type=data.get('device_type', 'plug'),
            status=data.get('status', 'off'),
            level=data.get('level', 0)
        )
        db.session.add(device)
        db.session.flush()  # Get device_id
        
        # Only devices in house_id=1/floor_id=1/room_id=1 exchange data with Adafruit.
        try:
            room = Room.query.get(device.room_id)
            if room and _is_target_room_id(room.room_id):
                feed_key = _resolve_device_feed_key(device.device_type)
                
                if feed_key:
                    create_adafruit_feed(feed_key, _build_feed_name(room, device.device_name))
                    mapping = AdafruitFeedMapping(
                        feed_key=feed_key,
                        feed_name=_build_feed_name(room, device.device_name),
                        device_id=device.device_id,
                        house_id=room.floor.house_id,
                        room_id=room.room_id,
                        feed_type='device',
                        data_key='level' if device.device_type == 'fan' else 'status',
                        conversion_factor=1.0,
                        is_active=True
                    )
                    db.session.add(mapping)
                    logger.info(f"✅ Mapped new device: {device.device_id} → feed_key={feed_key}")
        except Exception as e:
            logger.error(f"⚠️ Failed to create mapping: {e}")
            # Continue anyway
        
        db.session.commit()
        return jsonify({'success': True, 'id': device.device_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# PUT/DELETE endpoints for Houses, Floors, Rooms, Devices
@app.route('/api/houses/<int:house_id>', methods=['PUT'])
@require_auth
def update_house(house_id):
    try:
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404
        
        data = request.json
        house.house_name = data.get('name', house.house_name)
        house.address = data.get('address', house.address)
        house.city = data.get('city', house.city)
        house.country = data.get('country', house.country)
        db.session.commit()
        return jsonify({'success': True, 'id': house.house_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/houses/<int:house_id>', methods=['DELETE'])
@require_auth
def delete_house(house_id):
    try:
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404
        
        db.session.delete(house)
        db.session.commit()
        return jsonify({'success': True, 'message': 'House deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/floors/<int:floor_id>', methods=['PUT'])
@require_auth
def update_floor(floor_id):
    try:
        floor = Floor.query.get(floor_id)
        if not floor:
            return jsonify({'success': False, 'error': 'Floor not found'}), 404
        
        # Check if user owns this floor's house
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.json
        floor.floor_name = data.get('floor_name', floor.floor_name)
        floor.floor_number = data.get('floor_number', floor.floor_number)
        floor.description = data.get('description', floor.description)
        db.session.commit()
        return jsonify({'success': True, 'id': floor.floor_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/floors/<int:floor_id>', methods=['DELETE'])
@require_auth
def delete_floor(floor_id):
    try:
        floor = Floor.query.get(floor_id)
        if not floor:
            return jsonify({'success': False, 'error': 'Floor not found'}), 404
        
        # Check if user owns this floor's house
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        db.session.delete(floor)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Floor deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
@require_auth
def update_room(room_id):
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        # Check ownership through floor -> house
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.json
        room.room_name = data.get('room_name', room.room_name)
        room.room_type = data.get('room_type', room.room_type)
        room.description = data.get('description', room.description)
        room.area = data.get('area', room.area)
        db.session.commit()
        return jsonify({'success': True, 'id': room.room_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@require_auth
def delete_room(room_id):
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        # Check ownership through floor -> house
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        db.session.delete(room)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Room deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/devices/<int:device_id>', methods=['PUT'])
@require_auth
def update_device(device_id):
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        # Check ownership through room -> floor -> house
        room = Room.query.get(device.room_id)
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.json
        old_status = device.status
        old_level = device.level
        
        # Update device properties
        device.device_name = data.get('device_name', device.device_name)
        device.device_type = data.get('device_type', device.device_type)
        device.status = data.get('status', device.status)
        if device.device_type == 'fan':
            device.level = data.get('level', device.level)
        else:
            device.level = 0
        device.updated_at = datetime.utcnow()
        
        # 🔥 Publish command to Adafruit if status/level changed
        if data.get('status') and data.get('status') != old_status:
            logger.info(f"📤 Status changed: {old_status} → {device.status}")
            publish_device_command(device_id, 'status', device.status)
        
        if device.device_type == 'fan' and data.get('level') is not None and data.get('level') != old_level:
            logger.info(f"📤 Level changed: {old_level} → {device.level}")
            publish_device_command(device_id, 'level', device.level)
        
        db.session.commit()
        
        # 📝 Log device activity for dashboard usage tracking
        # Create log regardless of what changed (status, level, or both)
        log = DeviceActivityLog(
            device_id=device_id,
            user_id=request.user_id,
            action='set_level' if (device.device_type == 'fan' and data.get('level') is not None and data.get('level') != old_level) else ('turn_on' if device.status == 'on' else 'turn_off'),
            old_status=old_status,
            new_status=device.status,
            old_level=old_level,
            new_level=device.level,
            triggered_by='user',
            reason=f'User updated device: {old_status}→{device.status} (level {old_level}→{device.level})'
        )
        db.session.add(log)
        db.session.commit()
        
        logger.info(f"✅ Activity logged: Device {device_id} {old_status}→{device.status}")
        
        return jsonify({
            'success': True,
            'id': device.device_id,
            'message': 'Device updated and command sent to hardware'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating device: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/devices/<int:device_id>', methods=['DELETE'])
@require_auth
def delete_device(device_id):
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        # Check ownership through room -> floor -> house
        room = Room.query.get(device.room_id)
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        db.session.delete(device)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Device deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# Sensor CRUD endpoints
@app.route('/api/sensors', methods=['POST'])
@require_auth
def create_sensor():
    try:
        data = request.json
        sensor_name = data.get('sensor_name')
        room_id = data.get('room_id')
        
        if not sensor_name or not sensor_name.strip():
            return jsonify({'success': False, 'error': 'Sensor name is required'}), 400
        
        if not room_id:
            return jsonify({'success': False, 'error': 'Room ID is required'}), 400
        
        # Check ownership through room -> floor -> house
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        sensor = Sensor(
            room_id=room_id,
            sensor_name=sensor_name.strip(),
            sensor_type=data.get('sensor_type', 'other')
        )
        # Auto-set unit based on sensor type
        sensor.unit = get_sensor_unit(sensor.sensor_type)
        db.session.add(sensor)
        db.session.flush()  # Get sensor_id
        
        # Only sensors in house_id=1/floor_id=1/room_id=1 exchange data with Adafruit.
        try:
            feed_key = _resolve_sensor_feed_key(sensor.sensor_type) if _is_target_room_id(room.room_id) else None
            
            if feed_key:
                create_adafruit_feed(feed_key, _build_feed_name(room, sensor.sensor_name))
                mapping = AdafruitFeedMapping(
                    feed_key=feed_key,
                    feed_name=_build_feed_name(room, sensor.sensor_name),
                    sensor_id=sensor.sensor_id,
                    house_id=house.house_id,
                    room_id=room.room_id,
                    feed_type='sensor',
                    conversion_factor=1.0,
                    is_active=True
                )
                db.session.add(mapping)
                logger.info(f"✅ Mapped new sensor: {sensor.sensor_id} → feed_key={feed_key}")
        except Exception as e:
            logger.error(f"⚠️ Failed to create mapping: {e}")
            # Continue anyway
        
        db.session.commit()
        return jsonify({'success': True, 'id': sensor.sensor_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/sensors/<int:sensor_id>', methods=['PUT'])
@require_auth
def update_sensor(sensor_id):
    try:
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return jsonify({'success': False, 'error': 'Sensor not found'}), 404
        
        # Check ownership through room -> floor -> house
        room = Room.query.get(sensor.room_id)
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.json
        sensor.sensor_name = data.get('sensor_name', sensor.sensor_name)
        sensor.sensor_type = data.get('sensor_type', sensor.sensor_type)
        # Auto-update unit based on sensor type
        sensor.unit = get_sensor_unit(sensor.sensor_type)
        db.session.commit()
        return jsonify({'success': True, 'id': sensor.sensor_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/sensors/<int:sensor_id>', methods=['DELETE'])
@require_auth
def delete_sensor(sensor_id):
    try:
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return jsonify({'success': False, 'error': 'Sensor not found'}), 404
        
        # Check ownership through room -> floor -> house
        room = Room.query.get(sensor.room_id)
        floor = Floor.query.get(room.floor_id)
        house = House.query.get(floor.house_id)
        if house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        db.session.delete(sensor)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Sensor deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

# =====================================================
# API - SENSORS
# =====================================================

@app.route('/api/rooms/<int:room_id>/sensors', methods=['GET'])
def get_sensors(room_id):
    try:
        sensors = Sensor.query.filter_by(room_id=room_id).all()
        sensor_list = []
        for s in sensors:
            # Get latest sensor data
            latest_data = SensorData.query.filter_by(sensor_id=s.sensor_id).order_by(SensorData.timestamp.desc()).first()
            sensor_list.append({
                'id': s.sensor_id, 
                'name': s.sensor_name, 
                'type': s.sensor_type,
                'unit': s.unit,
                'value': latest_data.value if latest_data else None,
                'timestamp': latest_data.timestamp.isoformat() if latest_data else None
            })
        return jsonify({
            'success': True,
            'data': sensor_list
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sensors/<int:sensor_id>/data', methods=['GET'])
def get_sensor_data(sensor_id):
    try:
        data_points = SensorData.query.filter_by(sensor_id=sensor_id).order_by(SensorData.timestamp.desc()).limit(100).all()
        return jsonify({
            'success': True,
            'data': [{'id': d.data_id, 'value': d.value, 'timestamp': d.timestamp.isoformat()} for d in data_points]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sensor-data', methods=['POST'])
def post_sensor_data():
    """Save sensor reading ⭐ Sync endpoint"""
    try:
        data = request.json
        sensor_data = SensorData(
            sensor_id=data.get('sensor_id'),
            value=data.get('value'),
            timestamp=datetime.fromisoformat(data.get('timestamp', datetime.utcnow().isoformat()))
        )
        db.session.add(sensor_data)
        db.session.commit()
        
        logger.info(f"📊 Sensor {data.get('sensor_id')}: {data.get('value')}")
        
        return jsonify({'success': True, 'id': sensor_data.data_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/sensor-data/latest', methods=['GET'])
def get_latest_sensor_data():
    try:
        latest = db.session.query(SensorData).order_by(SensorData.timestamp.desc()).limit(10).all()
        return jsonify({
            'success': True,
            'data': [{'sensor_id': d.sensor_id, 'value': d.value, 'timestamp': d.timestamp.isoformat()} for d in latest]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# =====================================================
# API - ALERTS
# =====================================================

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        alerts = Alert.query.filter_by(is_read=False).all()
        return jsonify({
            'success': True,
            'data': [{'id': a.alert_id, 'type': a.alert_type, 'message': a.message, 'created_at': a.created_at.isoformat()} for a in alerts]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# =====================================================
# ERROR HANDLERS
# =====================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

# =====================================================
# API - ADMIN MANAGEMENT (ADMIN ONLY)
# =====================================================

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def admin_get_all_users():
    """Get all users (admin only)"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    users = AdminService.get_all_users(active_only)
    log_activity('users_listed', 'user', description='Listed all users')
    return jsonify({'success': True, 'data': users, 'count': len(users)}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
@require_admin
def admin_get_user(user_id):
    """Get specific user details (admin only)"""
    user = AdminService.get_user_by_id(user_id)
    if user:
        log_activity('user_viewed', 'user', user_id)
        return jsonify({'success': True, 'data': user}), 200
    return jsonify({'success': False, 'error': 'User not found'}), 404

@app.route('/api/admin/users/<int:user_id>/disable', methods=['PUT'])
@require_admin
def admin_disable_user(user_id):
    """Disable a user account (admin only)"""
    reason = request.json.get('reason', '')
    success = AdminService.disable_user(user_id, reason)
    if success:
        log_activity('user_disabled', 'user', user_id, f'Disabled: {reason}')
        return jsonify({'success': True, 'message': 'User disabled'}), 200
    return jsonify({'success': False, 'error': 'Failed to disable user'}), 500

@app.route('/api/admin/users/<int:user_id>/enable', methods=['PUT'])
@require_admin
def admin_enable_user(user_id):
    """Enable a disabled user account (admin only)"""
    success = AdminService.enable_user(user_id)
    if success:
        log_activity('user_enabled', 'user', user_id)
        return jsonify({'success': True, 'message': 'User enabled'}), 200
    return jsonify({'success': False, 'error': 'Failed to enable user'}), 500

@app.route('/api/admin/users/<int:user_id>/delete', methods=['DELETE'])
@require_admin
def admin_delete_user(user_id):
    """Delete a user account (admin only)"""
    if user_id == request.user_id:
        return jsonify({'success': False, 'error': 'Cannot delete your own account'}), 400
    
    success = AdminService.delete_user(user_id)
    if success:
        log_activity('user_deleted', 'user', user_id)
        return jsonify({'success': True, 'message': 'User deleted'}), 200
    return jsonify({'success': False, 'error': 'Failed to delete user'}), 500

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def admin_change_user_role(user_id):
    """Change user role (admin only)"""
    if user_id == request.user_id:
        return jsonify({'success': False, 'error': 'Cannot change your own role'}), 400
    
    # Accept both 'role' and 'new_role' parameter names
    new_role = request.json.get('new_role') or request.json.get('role', 'user')
    success = AdminService.change_user_role(user_id, new_role)
    if success:
        log_activity('user_role_changed', 'user', user_id, f'Role changed to {new_role}')
        return jsonify({'success': True, 'message': f'User role changed to {new_role}'}), 200
    return jsonify({'success': False, 'error': 'Invalid role'}), 400

@app.route('/api/admin/houses/<int:house_id>/share', methods=['POST'])
@require_admin
def admin_share_house(house_id):
    """Share a house with another user (admin can do this)"""
    data = request.json
    owner_id = request.user_id
    target_user_id = data.get('target_user_id')
    access_level = data.get('access_level', 'viewer')
    
    if not target_user_id:
        return jsonify({'success': False, 'error': 'target_user_id required'}), 400
    
    success = AdminService.share_house(house_id, owner_id, target_user_id, access_level)
    if success:
        log_activity('house_shared', 'house', house_id, f'Shared with user {target_user_id}')
        return jsonify({'success': True, 'message': 'House shared'}), 200
    return jsonify({'success': False, 'error': 'Failed to share house'}), 500

@app.route('/api/admin/houses/<int:house_id>/unshare', methods=['POST'])
@require_admin
def admin_unshare_house(house_id):
    """Revoke house access from a user"""
    data = request.json
    owner_id = request.user_id
    target_user_id = data.get('target_user_id')
    
    if not target_user_id:
        return jsonify({'success': False, 'error': 'target_user_id required'}), 400
    
    success = AdminService.unshare_house(house_id, owner_id, target_user_id)
    if success:
        log_activity('house_unshared', 'house', house_id, f'Removed access for user {target_user_id}')
        return jsonify({'success': True, 'message': 'House access removed'}), 200
    return jsonify({'success': False, 'error': 'Failed to remove access'}), 500

@app.route('/api/admin/houses/<int:house_id>/users/<int:user_id>/access-level', methods=['POST'])
@require_admin
def admin_change_user_access_level(house_id, user_id):
    """Change access level for a user on a house"""
    data = request.json
    owner_id = request.user_id
    new_access_level = data.get('access_level')
    
    if not new_access_level:
        return jsonify({'success': False, 'error': 'access_level required'}), 400
    
    if new_access_level not in ['viewer', 'manager', 'owner']:
        return jsonify({'success': False, 'error': 'Invalid access level'}), 400
    
    success = AdminService.change_access_level(house_id, owner_id, user_id, new_access_level)
    if success:
        log_activity('access_level_changed', 'house', house_id, f'User {user_id} access level changed to {new_access_level}')
        return jsonify({'success': True, 'message': 'Access level changed'}), 200
    return jsonify({'success': False, 'error': 'Failed to change access level'}), 500

@app.route('/api/admin/houses/<int:house_id>/users', methods=['GET'])
@require_admin
def admin_get_house_users(house_id):
    """Get all users who have access to a house (admin only)"""
    users = AdminService.get_house_users(house_id)
    log_activity('house_users_listed', 'house', house_id)
    return jsonify({'success': True, 'data': users, 'count': len(users)}), 200

@app.route('/api/admin/activity-logs', methods=['GET'])
@require_admin
def admin_get_activity_logs():
    """Get activity logs (admin only)"""
    limit = request.args.get('limit', 100, type=int)
    user_id = request.args.get('user_id', None, type=int)
    action = request.args.get('action', None)
    
    logs = AdminService.get_activity_logs(limit, user_id, action)
    return jsonify({'success': True, 'data': logs, 'count': len(logs)}), 200

@app.route('/api/admin/user/<int:user_id>/activity', methods=['GET'])
@require_admin
def admin_get_user_activity(user_id):
    """Get activity for a specific user (admin only)"""
    days = request.args.get('days', 7, type=int)
    logs = AdminService.get_user_activity(user_id, days)
    return jsonify({'success': True, 'data': logs, 'count': len(logs)}), 200

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def admin_get_stats():
    """Get system statistics (admin only)"""
    stats = AdminService.get_system_stats()
    log_activity('stats_viewed', 'system')
    return jsonify({'success': True, 'data': stats}), 200

# =====================================================
# API - AUTOMATION RULES (Multi-condition with AND/OR logic)
# =====================================================

@app.route('/api/rooms/<int:room_id>/automation-rules', methods=['GET'])
@require_auth
def get_automation_rules(room_id):
    """Get all automation rules for a room"""
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        rules = AutomationRule.query.filter_by(room_id=room_id).all()
        print(f"✅ Found {len(rules)} rules for room {room_id}")
        
        rules_data = []
        for r in rules:
            try:
                rules_data.append(r.to_dict())
            except Exception as rule_error:
                print(f"❌ Error serializing rule {r.rule_id}: {rule_error}")
                continue
        
        return jsonify({
            'success': True,
            'data': rules_data,
            'count': len(rules_data)
        }), 200
    except Exception as e:
        print(f"❌ Error fetching automation rules: {e}")
        logger.error(f"Error fetching automation rules: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rooms/<int:room_id>/automation-rules', methods=['POST'])
@require_auth
def create_automation_rule(room_id):
    """Create a new automation rule with multiple conditions"""
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        data = request.json
        rule_name = data.get('rule_name')
        logic_type = data.get('logic_type', 'AND')  # AND or OR
        action_device_id = data.get('action_device_id')
        action_status = data.get('action_status')  # on or off
        action_level = data.get('action_level', 0)
        conditions = data.get('conditions', [])  # List of {sensor_type, operator, threshold_value}
        
        if not rule_name or not action_device_id or not action_status or not conditions:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        if logic_type not in ['AND', 'OR']:
            return jsonify({'success': False, 'error': 'logic_type must be AND or OR'}), 400
        
        # Import AutomationService
        from automation_service import AutomationService
        
        rule = AutomationService.create_rule(
            room_id=room_id,
            rule_name=rule_name,
            logic_type=logic_type,
            action_device_id=action_device_id,
            action_status=action_status,
            action_level=action_level,
            conditions=conditions
        )
        
        if not rule:
            return jsonify({'success': False, 'error': 'Failed to create rule'}), 500
        
        return jsonify({'success': True, 'rule': rule.to_dict()}), 201
    except Exception as e:
        logger.error(f"Error creating automation rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation-rules/<int:rule_id>', methods=['GET'])
@require_auth
def get_automation_rule(rule_id):
    """Get a specific automation rule"""
    try:
        rule = AutomationRule.query.get(rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        return jsonify({'success': True, 'rule': rule.to_dict()}), 200
    except Exception as e:
        logger.error(f"Error fetching automation rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation-rules/<int:rule_id>', methods=['PUT'])
@require_auth
def update_automation_rule(rule_id):
    """Update an automation rule"""
    try:
        rule = AutomationRule.query.get(rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        data = request.json
        rule_name = data.get('rule_name')
        logic_type = data.get('logic_type')
        action_device_id = data.get('action_device_id')
        action_status = data.get('action_status')
        action_level = data.get('action_level')
        conditions = data.get('conditions')
        
        from automation_service import AutomationService
        
        updated_rule = AutomationService.update_rule(
            rule_id=rule_id,
            rule_name=rule_name,
            logic_type=logic_type,
            action_device_id=action_device_id,
            action_status=action_status,
            action_level=action_level,
            conditions=conditions
        )
        
        if not updated_rule:
            return jsonify({'success': False, 'error': 'Failed to update rule'}), 500
        
        return jsonify({'success': True, 'rule': updated_rule.to_dict()}), 200
    except Exception as e:
        logger.error(f"Error updating automation rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation-rules/<int:rule_id>', methods=['DELETE'])
@require_auth
def delete_automation_rule(rule_id):
    """Delete an automation rule"""
    try:
        rule = AutomationRule.query.get(rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        from automation_service import AutomationService
        
        if not AutomationService.delete_rule(rule_id):
            return jsonify({'success': False, 'error': 'Failed to delete rule'}), 500
        
        return jsonify({'success': True, 'message': 'Rule deleted'}), 200
    except Exception as e:
        logger.error(f"Error deleting automation rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation-rules/<int:rule_id>/toggle', methods=['POST'])
@require_auth
def toggle_automation_rule(rule_id):
    """Toggle automation rule on/off"""
    try:
        rule = AutomationRule.query.get(rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        rule.is_active = not rule.is_active
        db.session.commit()
        
        status = "enabled" if rule.is_active else "disabled"
        logger.info(f"✅ Rule {rule_id} {status}")
        
        return jsonify({
            'success': True,
            'rule': rule.to_dict(),
            'message': f'Rule {status}'
        }), 200
    except Exception as e:
        logger.error(f"Error toggling automation rule: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation-rules/<int:rule_id>/test', methods=['POST'])
@require_auth
def test_automation_rule(rule_id):
    """Test if an automation rule conditions are met (for debugging)"""
    try:
        rule = AutomationRule.query.get(rule_id)
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        from automation_service import AutomationService
        
        is_met = AutomationService.evaluate_rule(rule_id)
        
        return jsonify({
            'success': True,
            'rule_id': rule_id,
            'rule_name': rule.rule_name,
            'conditions_met': is_met,
            'logic_type': rule.logic_type,
            'conditions': [c.to_dict() for c in rule.conditions]
        }), 200
    except Exception as e:
        logger.error(f"Error testing automation rule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# FEATURE 1: DASHBOARD & STATISTICS
# =====================================================

@app.route('/api/houses/<int:house_id>/stats', methods=['GET'])
@require_auth
def get_dashboard_stats(house_id):
    """
    Get dashboard statistics for a house
    Returns: device counts, sensor counts, automation stats, etc.
    """
    try:
        # Check if user has access to this house
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404

        start_date = request.args.get('start_date')
        start_dt = None
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
            except Exception:
                start_dt = None
        
        # Query stats from database or calculate on-the-fly
        stats = DashboardStats.query.filter_by(house_id=house_id).first()

        if stats:
            stats_dict = stats.to_dict()
        else:
            # Calculate static stats
            floors = Floor.query.filter_by(house_id=house_id).count()
            rooms = Room.query.join(Floor).filter(Floor.house_id == house_id).count()
            devices = Device.query.join(Room).join(Floor).filter(Floor.house_id == house_id).all()

            total_devices = len(devices)
            devices_online = sum(1 for d in devices if d.connection_status == 'online')
            devices_offline = total_devices - devices_online
            devices_on = sum(1 for d in devices if d.status == 'on')
            devices_off = total_devices - devices_on

            sensors = Sensor.query.join(Room).join(Floor).filter(Floor.house_id == house_id).count()

            rules = AutomationRule.query.join(Room).join(Floor).filter(Floor.house_id == house_id).all()
            total_rules = len(rules)
            active_rules = sum(1 for r in rules if r.is_active)

            # Get last device change
            last_change = DeviceHistory.query.join(Device).join(Room).join(Floor)\
                .filter(Floor.house_id == house_id).order_by(DeviceHistory.changed_at.desc()).first()

            stats_dict = {
                'house_id': house_id,
                'total_devices': total_devices,
                'devices_online': devices_online,
                'devices_offline': devices_offline,
                'devices_on': devices_on,
                'devices_off': devices_off,
                'total_sensors': sensors,
                'automation_rules_total': total_rules,
                'automation_rules_active': active_rules,
                'total_rooms': rooms,
                'total_floors': floors,
                'last_device_change': last_change.changed_at.isoformat() if last_change else None
            }

        activity_query = DeviceActivityLog.query.join(Device).join(Room).join(Floor).filter(Floor.house_id == house_id)
        if start_dt:
            activity_query = activity_query.filter(DeviceActivityLog.timestamp >= start_dt)

        turn_on_count = activity_query.filter(DeviceActivityLog.action == 'turn_on').count()
        turn_off_count = activity_query.filter(DeviceActivityLog.action == 'turn_off').count()
        automation_run_count = activity_query.filter(DeviceActivityLog.triggered_by == 'automation_rule').count()

        threshold_query = Alert.query.join(Room).join(Floor).filter(
            Floor.house_id == house_id,
            Alert.alert_type == 'threshold'
        )
        if start_dt:
            threshold_query = threshold_query.filter(Alert.created_at >= start_dt)

        threshold_alert_count = threshold_query.count()

        last_turn_on = activity_query.filter(DeviceActivityLog.action == 'turn_on')\
            .order_by(DeviceActivityLog.timestamp.desc()).first()
        last_turn_off = activity_query.filter(DeviceActivityLog.action == 'turn_off')\
            .order_by(DeviceActivityLog.timestamp.desc()).first()

        stats_dict.update({
            'turn_on_count': turn_on_count,
            'turn_off_count': turn_off_count,
            'threshold_alert_count': threshold_alert_count,
            'automation_run_count': automation_run_count,
            'last_turn_on_at': last_turn_on.timestamp.isoformat() if last_turn_on else None,
            'last_turn_off_at': last_turn_off.timestamp.isoformat() if last_turn_off else None,
        })

        return jsonify({'success': True, 'stats': stats_dict}), 200
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/houses/<int:house_id>/activity-summary', methods=['GET'])
@require_auth
def get_activity_summary(house_id):
    """
    Get activity summary: recent device changes in this house
    Returns: Last 10 activities
    """
    try:
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404
        
        # Get recent device activities
        activities = DeviceActivityLog.query.join(Device).join(Room).join(Floor)\
            .filter(Floor.house_id == house_id)\
            .order_by(DeviceActivityLog.timestamp.desc())\
            .limit(10).all()
        
        return jsonify({
            'success': True,
            'activities': [a.to_dict() for a in activities]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching activity summary: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/houses/<int:house_id>/device-usage', methods=['GET'])
@require_auth
def get_device_usage(house_id):
    """
    Get device usage time for all devices in a house
    Query params:
      - period: 'today' (default), 'week', 'month'
    Returns: List of devices with their usage time in minutes
    """
    try:
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404
        
        period = request.args.get('period', 'today')
        now = datetime.now()
        
        # Calculate start date based on period
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get all devices in the house
        devices = Device.query.join(Room).join(Floor).filter(Floor.house_id == house_id).all()

        device_usage = []
        for device in devices:
            # Include both ON and OFF activities (and level changes) within the period
            actions_to_fetch = ['turn_on', 'turn_off', 'schedule_executed', 'schedule_auto_off', 'set_level', 'toggle']
            activities = DeviceActivityLog.query.filter(
                DeviceActivityLog.device_id == device.device_id,
                DeviceActivityLog.timestamp >= start_date,
                DeviceActivityLog.action.in_(actions_to_fetch)
            ).order_by(DeviceActivityLog.timestamp).all()

            # Calculate usage time by pairing on -> off intervals
            total_minutes = 0.0
            turn_on_time = None

            for act in activities:
                # Normalize 'on' event detection
                is_on_event = (str(act.new_status).lower() == 'on') or (act.action == 'set_level' and act.new_level is not None and act.new_level > 0)
                is_off_event = (str(act.new_status).lower() == 'off') or (act.action == 'set_level' and act.new_level == 0) or (act.action in ['turn_off', 'schedule_auto_off'])

                if is_on_event:
                    if turn_on_time is None:
                        turn_on_time = act.timestamp
                elif is_off_event:
                    if turn_on_time:
                        duration = (act.timestamp - turn_on_time).total_seconds() / 60.0
                        total_minutes += max(0.0, duration)
                        turn_on_time = None

            # If the device is currently ON, account for running time up to now
            if device.status == 'on':
                if turn_on_time is None:
                    # No on event inside the window -> device was already on at start_date
                    total_minutes += max(0.0, (now - start_date).total_seconds() / 60.0)
                else:
                    total_minutes += max(0.0, (now - turn_on_time).total_seconds() / 60.0)

            # Round and format
            total_minutes = round(total_minutes, 2)
            device_usage.append({
                'device_id': device.device_id,
                'device_name': device.device_name,
                'device_type': device.device_type,
                'status': device.status,
                'usage_minutes': total_minutes,
                'usage_hours': round(total_minutes / 60.0, 2),
                'usage_display': f"{int(total_minutes // 60)}h {int(total_minutes % 60)}m"
            })
        
        return jsonify({
            'success': True,
            'period': period,
            'start_date': start_date.isoformat(),
            'devices': device_usage
        }), 200
    except Exception as e:
        logger.error(f"Error fetching device usage: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# =====================================================
# FEATURE 2: DEVICE SCHEDULING
# =====================================================

@app.route('/api/devices/<int:device_id>/schedules', methods=['GET'])
@require_auth
def get_device_schedules(device_id):
    """Get all schedules for a device"""
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        schedules = Schedule.query.filter_by(device_id=device_id).all()
        return jsonify({
            'success': True,
            'device_id': device_id,
            'device_name': device.device_name,
            'schedules': [{
                'schedule_id': s.schedule_id,
                'device_id': s.device_id,
                'scheduled_time': s.scheduled_time.strftime('%H:%M') if s.scheduled_time else None,
                'action_status': s.action_status,
                'action_level': s.action_level,
                'duration_minutes': s.duration_minutes,
                'days_of_week': s.days_of_week,
                'is_active': s.is_active,
                'last_triggered_at': s.last_triggered_at.isoformat() if s.last_triggered_at else None,
                'auto_off_at': s.auto_off_at.isoformat() if s.auto_off_at else None,
                'created_at': s.created_at.isoformat() if s.created_at else None
            } for s in schedules]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching device schedules: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/devices/<int:device_id>/schedules', methods=['POST'])
@require_auth
def create_device_schedule(device_id):
    """
    Create a new schedule for a device
    Body: {
        scheduled_time: "HH:MM",
        action_status: "on"|"off",
        action_level: 0-100,
        duration_minutes: 30 (optional, 0 = forever),
        days_of_week: "0,1,2,3,4,5,6"
    }
    """
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        data = request.json
        scheduled_time = data.get('scheduled_time')  # "14:30"
        action_status = data.get('action_status')
        action_level = data.get('action_level', 0)
        duration_minutes = data.get('duration_minutes', 0)  # 0 = forever
        days_of_week = data.get('days_of_week', '0,1,2,3,4,5,6')  # All days by default
        
        if not scheduled_time or action_status not in ['on', 'off']:
            return jsonify({'success': False, 'error': 'Invalid schedule parameters'}), 400
        
        # Validate duration
        if not isinstance(duration_minutes, int) or duration_minutes < 0:
            return jsonify({'success': False, 'error': 'duration_minutes must be >= 0'}), 400

        try:
            action_level = max(0, min(100, int(action_level or 0)))
        except (TypeError, ValueError):
            action_level = 0
        if device.device_type != 'fan' or action_status == 'off':
            action_level = 0
        
        # Parse time
        try:
            from datetime import time
            time_parts = scheduled_time.split(':')
            schedule_time = time(int(time_parts[0]), int(time_parts[1]))
        except:
            return jsonify({'success': False, 'error': 'Invalid time format. Use HH:MM'}), 400
        
        schedule = Schedule(
            device_id=device_id,
            scheduled_time=schedule_time,
            action_status=action_status,
            action_level=action_level,
            duration_minutes=duration_minutes,
            days_of_week=days_of_week,
            is_active=True
        )
        
        db.session.add(schedule)
        db.session.commit()
        
        # Log activity
        log = DeviceActivityLog(
            device_id=device_id,
            user_id=request.user_id,
            action='create_schedule',
            triggered_by='user',
            reason=f'Created schedule for {scheduled_time} (duration: {duration_minutes}m)',
            schedule_id=schedule.schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'schedule_id': schedule.schedule_id,
            'message': f'Schedule created: {scheduled_time} for {duration_minutes or "∞"} minutes'
        }), 201
    except Exception as e:
        logger.error(f"Error creating device schedule: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
@require_auth
def delete_schedule(schedule_id):
    """Delete a schedule"""
    try:
        schedule = Schedule.query.get(schedule_id)
        if not schedule:
            return jsonify({'success': False, 'error': 'Schedule not found'}), 404
        
        device_id = schedule.device_id
        db.session.delete(schedule)
        db.session.commit()
        
        # Log activity
        log = DeviceActivityLog(
            device_id=device_id,
            user_id=request.user_id,
            action='delete_schedule',
            triggered_by='user',
            reason=f'Deleted schedule',
            schedule_id=schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Schedule deleted successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error deleting schedule: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/schedules/<int:schedule_id>', methods=['PUT'])
@require_auth
def update_schedule(schedule_id):
    """Update a schedule"""
    try:
        schedule = Schedule.query.get(schedule_id)
        if not schedule:
            return jsonify({'success': False, 'error': 'Schedule not found'}), 404
        
        data = request.json
        
        if 'scheduled_time' in data:
            try:
                from datetime import time
                time_parts = data['scheduled_time'].split(':')
                schedule.scheduled_time = time(int(time_parts[0]), int(time_parts[1]))
            except:
                return jsonify({'success': False, 'error': 'Invalid time format'}), 400
        
        if 'action_status' in data:
            schedule.action_status = data['action_status']
        if 'action_level' in data:
            try:
                schedule.action_level = max(0, min(100, int(data['action_level'] or 0)))
            except (TypeError, ValueError):
                schedule.action_level = 0
        if 'duration_minutes' in data:
            if not isinstance(data['duration_minutes'], int) or data['duration_minutes'] < 0:
                return jsonify({'success': False, 'error': 'duration_minutes must be >= 0'}), 400
            schedule.duration_minutes = data['duration_minutes']
        if 'days_of_week' in data:
            schedule.days_of_week = data['days_of_week']
        if 'is_active' in data:
            schedule.is_active = data['is_active']

        device = Device.query.get(schedule.device_id)
        if device and (device.device_type != 'fan' or schedule.action_status == 'off'):
            schedule.action_level = 0
        
        db.session.commit()
        
        # Log activity
        log = DeviceActivityLog(
            device_id=schedule.device_id,
            user_id=request.user_id,
            action='update_schedule',
            triggered_by='user',
            reason=f'Updated schedule (duration: {schedule.duration_minutes}m)',
            schedule_id=schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Schedule updated'}), 200
    except Exception as e:
        logger.error(f"Error updating schedule: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# FEATURE 6: DEVICE LOGS & HISTORY
# =====================================================

@app.route('/api/devices/<int:device_id>/activity-logs', methods=['GET'])
@require_auth
def get_device_activity_logs(device_id):
    """
    Get activity logs for a specific device with filtering
    Query params:
      - limit (default 50): Number of records per page
      - offset (default 0): Pagination offset
      - start_date: ISO format start date
      - end_date: ISO format end date
      - action: Filter by action (turn_on, turn_off, set_level)
      - triggered_by: Filter by trigger source (user, automation_rule, schedule, mqtt)
      - search: Search in reason field (case-insensitive)
    """
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        action_filter = request.args.get('action')
        triggered_by_filter = request.args.get('triggered_by')
        search_query = request.args.get('search')
        
        query = DeviceActivityLog.query.filter_by(device_id=device_id)
        
        # Date range filtering
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                query = query.filter(DeviceActivityLog.timestamp >= start)
            except:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
                query = query.filter(DeviceActivityLog.timestamp <= end)
            except:
                pass
        
        # Action type filtering
        if action_filter:
            query = query.filter_by(action=action_filter)
        
        # Trigger source filtering
        if triggered_by_filter:
            query = query.filter_by(triggered_by=triggered_by_filter)
        
        # Text search in reason field
        if search_query:
            query = query.filter(DeviceActivityLog.reason.ilike(f'%{search_query}%'))
        
        total = query.count()
        logs = query.order_by(DeviceActivityLog.timestamp.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'success': True,
            'total': total,
            'limit': limit,
            'offset': offset,
            'filters': {
                'action': action_filter,
                'triggered_by': triggered_by_filter,
                'search': search_query,
                'start_date': start_date,
                'end_date': end_date
            },
            'logs': [log.to_dict() for log in logs]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching device activity logs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/rooms/<int:room_id>/activity-logs', methods=['GET'])
@require_auth
def get_room_activity_logs(room_id):
    """
    Get activity logs for all devices in a room with filtering
    Query params:
      - limit (default 50): Number of records per page
      - offset (default 0): Pagination offset
      - start_date: ISO format start date
      - end_date: ISO format end date
      - action: Filter by action (turn_on, turn_off, set_level)
      - triggered_by: Filter by trigger source (user, automation_rule, schedule, mqtt)
      - search: Search in reason field (case-insensitive)
    """
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'success': False, 'error': 'Room not found'}), 404
        
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        action_filter = request.args.get('action')
        triggered_by_filter = request.args.get('triggered_by')
        search_query = request.args.get('search')
        
        # Get all devices in room and their logs
        devices = Device.query.filter_by(room_id=room_id).all()
        device_ids = [d.device_id for d in devices]
        
        if not device_ids:
            return jsonify({
                'success': True,
                'total': 0,
                'logs': [],
                'filters': {
                    'action': action_filter,
                    'triggered_by': triggered_by_filter,
                    'search': search_query,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }), 200
        
        query = DeviceActivityLog.query.filter(DeviceActivityLog.device_id.in_(device_ids))
        
        # Date range filtering
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                query = query.filter(DeviceActivityLog.timestamp >= start)
            except:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
                query = query.filter(DeviceActivityLog.timestamp <= end)
            except:
                pass
        
        # Action type filtering
        if action_filter:
            query = query.filter_by(action=action_filter)
        
        # Trigger source filtering
        if triggered_by_filter:
            query = query.filter_by(triggered_by=triggered_by_filter)
        
        # Text search in reason field
        if search_query:
            query = query.filter(DeviceActivityLog.reason.ilike(f'%{search_query}%'))
        
        total = query.count()
        logs = query.order_by(DeviceActivityLog.timestamp.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'success': True,
            'total': total,
            'limit': limit,
            'offset': offset,
            'filters': {
                'action': action_filter,
                'triggered_by': triggered_by_filter,
                'search': search_query,
                'start_date': start_date,
                'end_date': end_date
            },
            'logs': [log.to_dict() for log in logs]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching room activity logs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/houses/<int:house_id>/activity-logs', methods=['GET'])
@require_auth
def get_house_activity_logs(house_id):
    """
    Get activity logs for all devices in a house with filtering
    Query params:
      - limit (default 100): Number of records per page
      - offset (default 0): Pagination offset
      - start_date: ISO format start date
      - end_date: ISO format end date
      - action: Filter by action (turn_on, turn_off, set_level)
      - triggered_by: Filter by trigger source (user, automation_rule, schedule, mqtt)
      - search: Search in reason field (case-insensitive)
    """
    try:
        house = House.query.get(house_id)
        if not house or house.user_id != request.user_id:
            return jsonify({'success': False, 'error': 'House not found or access denied'}), 404
        
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        action_filter = request.args.get('action')
        triggered_by_filter = request.args.get('triggered_by')
        search_query = request.args.get('search')
        
        # Get all devices in house via rooms and floors
        floors = Floor.query.filter_by(house_id=house_id).all()
        floor_ids = [f.floor_id for f in floors]
        
        if not floor_ids:
            return jsonify({'success': True, 'total': 0, 'logs': [], 'filters': {}}), 200
        
        rooms = Room.query.filter(Room.floor_id.in_(floor_ids)).all()
        room_ids = [r.room_id for r in rooms]
        
        if not room_ids:
            return jsonify({'success': True, 'total': 0, 'logs': [], 'filters': {}}), 200
        
        devices = Device.query.filter(Device.room_id.in_(room_ids)).all()
        device_ids = [d.device_id for d in devices]
        
        if not device_ids:
            return jsonify({'success': True, 'total': 0, 'logs': [], 'filters': {}}), 200
        
        # Build query
        query = DeviceActivityLog.query.filter(DeviceActivityLog.device_id.in_(device_ids))
        
        # Date range filtering
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                query = query.filter(DeviceActivityLog.timestamp >= start)
            except:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
                query = query.filter(DeviceActivityLog.timestamp <= end)
            except:
                pass
        
        # Action type filtering
        if action_filter:
            query = query.filter_by(action=action_filter)
        
        # Trigger source filtering
        if triggered_by_filter:
            query = query.filter_by(triggered_by=triggered_by_filter)
        
        # Text search in reason field
        if search_query:
            query = query.filter(DeviceActivityLog.reason.ilike(f'%{search_query}%'))
        
        total = query.count()
        logs = query.order_by(DeviceActivityLog.timestamp.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'success': True,
            'total': total,
            'limit': limit,
            'offset': offset,
            'filters': {
                'action': action_filter,
                'triggered_by': triggered_by_filter,
                'search': search_query,
                'start_date': start_date,
                'end_date': end_date
            },
            'logs': [log.to_dict() for log in logs]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching house activity logs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/devices/<int:device_id>/activity-summary', methods=['GET'])
@require_auth
def get_device_activity_summary(device_id):
    """
    Get activity summary for a device
    Returns: Total on time today, total actions today, last action, etc.
    """
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        from datetime import date, time
        today = date.today()
        today_start = datetime.combine(today, time.min)
        today_end = datetime.combine(today, time.max)
        
        # Today's activities
        today_logs = DeviceActivityLog.query.filter(
            DeviceActivityLog.device_id == device_id,
            DeviceActivityLog.timestamp >= today_start,
            DeviceActivityLog.timestamp <= today_end
        ).all()
        
        # Count turn_on and turn_off actions
        turn_on_count = sum(1 for log in today_logs if log.action == 'turn_on')
        turn_off_count = sum(1 for log in today_logs if log.action == 'turn_off')
        
        # Get last action
        last_log = DeviceActivityLog.query.filter_by(device_id=device_id)\
            .order_by(DeviceActivityLog.timestamp.desc()).first()
        
        return jsonify({
            'success': True,
            'device_id': device_id,
            'today_turn_on': turn_on_count,
            'today_turn_off': turn_off_count,
            'today_total_actions': len(today_logs),
            'last_action': last_log.to_dict() if last_log else None
        }), 200
    except Exception as e:
        logger.error(f"Error fetching device activity summary: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# =====================================================
# ADAFRUIT IO FEED MAPPING MANAGEMENT
# =====================================================

@app.route('/api/adafruit/mappings', methods=['GET'])
@require_auth
def get_adafruit_mappings():
    """Get all Adafruit feed mappings for user's houses"""
    try:
        # Get user's houses
        user_houses = UserHouseAccess.query.filter_by(user_id=request.user_id).all()
        house_ids = [h.house_id for h in user_houses]
        
        if not house_ids:
            return jsonify({'success': True, 'data': []}), 200
        
        # Get mappings for these houses
        mappings = AdafruitFeedMapping.query.filter(
            AdafruitFeedMapping.house_id.in_(house_ids)
        ).all()
        
        return jsonify({
            'success': True,
            'data': [m.to_dict() for m in mappings]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching mappings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/adafruit/mappings/<int:mapping_id>', methods=['GET'])
@require_auth
def get_adafruit_mapping(mapping_id):
    """Get specific Adafruit feed mapping"""
    try:
        mapping = AdafruitFeedMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'error': 'Mapping not found'}), 404
        
        # Check authorization
        if mapping.house_id not in [h.house_id for h in UserHouseAccess.query.filter_by(user_id=request.user_id).all()]:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        return jsonify({
            'success': True,
            'data': mapping.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Error fetching mapping: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/adafruit/mappings', methods=['POST'])
@require_auth
def create_adafruit_mapping():
    """Create new Adafruit feed mapping
    
    Body:
    {
        "feed_key": "temperature-sensor-1",
        "feed_name": "home/sensor/1",
        "house_id": 1,
        "room_id": 2,
        "device_id": null,
        "sensor_id": 5,
        "feed_type": "sensor",
        "data_key": "value",
        "conversion_factor": 1.0
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['feed_key', 'house_id', 'feed_type']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        try:
            mapping_house_id = int(data.get('house_id'))
            mapping_room_id = int(data.get('room_id'))
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'house_id and room_id must be integers'}), 400

        if mapping_house_id != TARGET_HOUSE_ID or mapping_room_id != TARGET_ROOM_ID:
            return jsonify({
                'success': False,
                'error': 'Only house_id=1, floor_id=1, room_id=1 can be mapped to Adafruit'
            }), 400
        
        # Check authorization
        user_house = UserHouseAccess.query.filter_by(
            user_id=request.user_id,
            house_id=data['house_id']
        ).first()
        
        if not user_house or user_house.access_level == AccessLevel.VIEWER:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Check if feed_key already mapped
        existing = AdafruitFeedMapping.query.filter_by(
            feed_key=data['feed_key']
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'Feed key already mapped'}), 400
        
        # Create mapping
        mapping = AdafruitFeedMapping(
            feed_key=data['feed_key'],
            feed_name=data.get('feed_name'),
            house_id=data['house_id'],
            room_id=data.get('room_id'),
            device_id=data.get('device_id'),
            sensor_id=data.get('sensor_id'),
            feed_type=data['feed_type'],
            data_key=data.get('data_key'),
            conversion_factor=data.get('conversion_factor', 1.0)
        )
        
        db.session.add(mapping)
        db.session.commit()
        
        logger.info(f"✅ Created feed mapping: {mapping.feed_key}")
        return jsonify({
            'success': True,
            'message': 'Feed mapping created',
            'data': mapping.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating mapping: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/adafruit/mappings/<int:mapping_id>', methods=['PUT'])
@require_auth
def update_adafruit_mapping(mapping_id):
    """Update Adafruit feed mapping"""
    try:
        mapping = AdafruitFeedMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'error': 'Mapping not found'}), 404
        
        # Check authorization
        user_house = UserHouseAccess.query.filter_by(
            user_id=request.user_id,
            house_id=mapping.house_id
        ).first()
        
        if not user_house or user_house.access_level == AccessLevel.VIEWER:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'room_id' in data:
            mapping.room_id = data['room_id']
        if 'device_id' in data:
            mapping.device_id = data['device_id']
        if 'sensor_id' in data:
            mapping.sensor_id = data['sensor_id']
        if 'data_key' in data:
            mapping.data_key = data['data_key']
        if 'conversion_factor' in data:
            mapping.conversion_factor = data['conversion_factor']
        if 'is_active' in data:
            mapping.is_active = data['is_active']
        
        db.session.commit()
        
        logger.info(f"✅ Updated feed mapping: {mapping.feed_name}")
        return jsonify({
            'success': True,
            'message': 'Feed mapping updated',
            'data': mapping.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating mapping: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/adafruit/mappings/<int:mapping_id>', methods=['DELETE'])
@require_auth
def delete_adafruit_mapping(mapping_id):
    """Delete Adafruit feed mapping"""
    try:
        mapping = AdafruitFeedMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'error': 'Mapping not found'}), 404
        
        # Check authorization
        user_house = UserHouseAccess.query.filter_by(
            user_id=request.user_id,
            house_id=mapping.house_id
        ).first()
        
        if not user_house or user_house.access_level == AccessLevel.VIEWER:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        feed_name = mapping.feed_name
        db.session.delete(mapping)
        db.session.commit()
        
        logger.info(f"✅ Deleted feed mapping: {feed_name}")
        return jsonify({
            'success': True,
            'message': 'Feed mapping deleted'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting mapping: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# =====================================================
# Phase 3: GET ADAFRUIT DATA & SIMULATION
# =====================================================

@app.route('/api/adafruit/data/<feed_key>', methods=['GET'])
@require_auth
def get_adafruit_data(feed_key):
    """Get historical data from Adafruit IO for a specific feed"""
    try:
        headers = {
            'X-AIO-Key': ADAFRUIT_KEY,
            'Content-Type': 'application/json'
        }
        
        limit = request.args.get('limit', '30')
        mapping = AdafruitFeedMapping.query.filter_by(
            feed_key=feed_key,
            room_id=TARGET_ROOM_ID,
            is_active=True
        ).first()
        if not mapping:
            return jsonify({'success': False, 'error': 'Feed is not mapped to target room'}), 404
        
        url = f'{ADAFRUIT_API_URL}/{ADAFRUIT_USERNAME}/feeds/{feed_key}/data'
        response = requests.get(
            url,
            params={'limit': limit},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'feed_key': feed_key,
                'data': data
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to fetch data from Adafruit: {response.status_code}'
            }), response.status_code
            
    except Exception as e:
        logger.error(f"Error fetching Adafruit data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/adafruit/fetch-live', methods=['POST'])
@require_auth
def fetch_live_adafruit_data():
    """
    🔥 Fetch LIVE data from Adafruit AND save to database
    Called when user clicks 'Update from Adafruit' button
    Expected request body: {"sensor_id": 8}
    """
    try:
        data = request.get_json()
        sensor_id = data.get('sensor_id')
        
        if not sensor_id:
            return jsonify({'success': False, 'error': 'sensor_id is required'}), 400
        
        # Get mapping by sensor_id
        mapping = AdafruitFeedMapping.query.filter_by(
            sensor_id=sensor_id,
            room_id=TARGET_ROOM_ID,
            feed_type='sensor',
            is_active=True
        ).first()
        
        if not mapping:
            return jsonify({'success': False, 'error': f'Feed mapping not found for sensor_id={sensor_id}'}), 404
        
        feed_key = mapping.feed_key
        
        # Fetch from Adafruit
        headers = {
            'X-AIO-Key': ADAFRUIT_KEY,
            'Content-Type': 'application/json'
        }
        
        url = f'{ADAFRUIT_API_URL}/{ADAFRUIT_USERNAME}/feeds/{feed_key}/data'
        response = requests.get(
            url,
            params={'limit': 1},  # Get latest only
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': f'Failed to fetch from Adafruit: {response.status_code}'
            }), response.status_code
        
        data = response.json()
        if not data or len(data) == 0:
            return jsonify({
                'success': False,
                'error': 'No data from Adafruit'
            }), 400
        
        latest = data[0]
        value = float(latest.get('value', 0))
        
        # Save to database
        if mapping.feed_type == 'sensor' and mapping.sensor_id:
            sensor = Sensor.query.get(mapping.sensor_id)
            if not sensor:
                return jsonify({'success': False, 'error': 'Sensor not found'}), 404
            
            # Apply conversion
            converted_value = value * mapping.conversion_factor
            
            sensor_data = SensorData(
                sensor_id=mapping.sensor_id,
                value=converted_value
            )
            db.session.add(sensor_data)
            db.session.commit()
            
            logger.info(f"✅ Live fetch & saved: {feed_key} = {converted_value} for sensor {mapping.sensor_id}")
            
            return jsonify({
                'success': True,
                'feed_key': feed_key,
                'sensor_id': mapping.sensor_id,
                'value': converted_value,
                'timestamp': latest.get('created_at'),
                'message': 'Data fetched from Adafruit and saved'
            }), 200
        
        elif mapping.feed_type == 'device' and mapping.device_id:
            device = Device.query.get(mapping.device_id)
            if not device:
                return jsonify({'success': False, 'error': 'Device not found'}), 404
            
            # Update device level
            new_level = max(0, min(100, int(value)))
            device.level = new_level
            device.status = 'on' if new_level > 0 else 'off'
            db.session.commit()
            
            logger.info(f"✅ Live fetch & updated: {feed_key} = {new_level}% for device {mapping.device_id}")
            
            return jsonify({
                'success': True,
                'feed_key': feed_key,
                'device_id': mapping.device_id,
                'level': new_level,
                'status': device.status,
                'timestamp': latest.get('created_at'),
                'message': 'Device data fetched from Adafruit'
            }), 200
        
        else:
            return jsonify({'success': False, 'error': 'Unknown mapping type'}), 400
            
    except Exception as e:
        logger.error(f"Error fetching live Adafruit data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/adafruit/simulate', methods=['POST'])
@require_auth
def simulate_data():
    """Trigger simulation of sensor data (for testing without real devices)"""
    try:
        # Check admin role
        if request.user_role != 'admin':
            return jsonify({'success': False, 'error': 'Admin only'}), 403
        
        simulate_sensor_data()
        
        return jsonify({
            'success': True,
            'message': 'Simulation triggered - check backend logs'
        }), 200
        
    except Exception as e:
        logger.error(f"Error triggering simulation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/adafruit/sync', methods=['POST'])
@require_auth
def sync_to_adafruit():
    """Sync all devices/sensors to Adafruit and create mappings"""
    try:
        # Check admin role
        if request.user_role != 'admin':
            return jsonify({'success': False, 'error': 'Admin only'}), 403
        
        success = sync_devices_to_adafruit()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Sync completed - check backend logs'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Sync failed - check backend logs'
            }), 500
        
    except Exception as e:
        logger.error(f"Error in sync endpoint: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/debug/sync', methods=['POST'])
def debug_sync():
    """🔧 DEBUG: Sync without auth (remove in production!)"""
    success = sync_devices_to_adafruit()
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Sync completed - check backend logs'
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': 'Sync failed - check backend logs'
        }), 500

# =====================================================
# RUN APP
# =====================================================
# =====================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        logger.info("✅ Database initialized with all tables")
        
        # ✅ Phase 2: Auto-sync devices to Adafruit on startup
        logger.info("🔄 Syncing devices/sensors to Adafruit...")
        sync_devices_to_adafruit()
        
        # Start automation checker after app is fully initialized
        automation_thread = threading.Thread(target=automation_checker, daemon=True)
        automation_thread.start()
        logger.info("✅ Automation checker started (checks every 30 seconds)")
        
        # Start schedule executor
        schedule_thread = threading.Thread(target=schedule_executor, daemon=True)
        schedule_thread.start()
        logger.info("✅ Schedule executor started (checks every 60 seconds)")
    
    socketio.run(app, host='0.0.0.0', port=8000, debug=False)
