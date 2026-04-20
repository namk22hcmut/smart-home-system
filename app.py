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
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:8000", "http://10.0.106.239:8000", "http://10.0.106.239:8081"])

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
                mappings = AdafruitFeedMapping.query.filter_by(is_active=True).all()
                
                if not mappings:
                    logger.warning("⚠️ No feed mappings found. Using wildcard subscribe...")
                    client.subscribe(f"{ADAFRUIT_USERNAME}/feeds/#")
                else:
                    for mapping in mappings:
                        topic = f"{ADAFRUIT_USERNAME}/feeds/{mapping.feed_key}"
                        client.subscribe(topic)
                        logger.info(f"📡 Subscribed: {topic}")
        except Exception as e:
            logger.warning(f"⚠️ Subscribe error: {e}. Falling back to wildcard...")
            client.subscribe(f"{ADAFRUIT_USERNAME}/feeds/#")
    else:
        logger.error(f"❌ MQTT connection failed with code {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    logger.info(f"📨 MQTT: {topic} = {payload}")
    
    # Parse Adafruit topic: {USERNAME}/feeds/{FEED_KEY}
    try:
        parts = topic.split('/feeds/')
        if len(parts) == 2 and parts[0] == ADAFRUIT_USERNAME:
            # Extract feed_key
            feed_key = parts[1]
            logger.info(f"🔍 Feed key: {feed_key}")
            
            # ✅ Look up mapping by feed_key (PRIMARY LOOKUP)
            mapping = AdafruitFeedMapping.query.filter_by(
                feed_key=feed_key,
                is_active=True
            ).first()
            
            if not mapping:
                logger.warning(f"⚠️ No mapping found for feed: {feed_path}")
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
                        new_status = 'on' if (value or payload.lower() in ['on', 'true', '1']) else 'off'
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
                socketio.emit('realtime_update', data_update, broadcast=True)
                logger.info(f"📡 Broadcast: {data_update}")
                
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
        
        # Find mapping for this device
        mapping = AdafruitFeedMapping.query.filter_by(
            device_id=device_id,
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
    """Auto-create Adafruit feeds for all devices/sensors in database"""
    logger.info("🔄 Starting sync_devices_to_adafruit()...")
    
    try:
        with app.app_context():
            # 🔹 Sync Sensors
            sensors = Sensor.query.all()
            for sensor in sensors:
                try:
                    room = Room.query.get(sensor.room_id)
                    if not room:
                        continue
                    
                    # Generate feed_key
                    feed_key = f"{sensor.sensor_type}-sensor-{sensor.sensor_id}".lower()
                    feed_name = f"{room.room_name} {sensor.sensor_name}"
                    
                    # Check if mapping exists
                    mapping = AdafruitFeedMapping.query.filter_by(feed_key=feed_key).first()
                    if mapping:
                        logger.info(f"✅ Sensor mapping exists: {feed_key}")
                        continue
                    
                    # Create feed in Adafruit
                    create_adafruit_feed(feed_key, feed_name)
                    
                    # Create mapping
                    mapping = AdafruitFeedMapping(
                        feed_key=feed_key,
                        feed_name=f"home/sensor/{sensor.sensor_id}",
                        sensor_id=sensor.sensor_id,
                        house_id=room.floor.house_id,
                        room_id=room.room_id,
                        feed_type='sensor',
                        conversion_factor=1.0,
                        is_active=True
                    )
                    db.session.add(mapping)
                    logger.info(f"📡 Created sensor mapping: {feed_key}")
                except Exception as e:
                    logger.error(f"Error syncing sensor {sensor.sensor_id}: {e}")
                    continue
            
            # 🔹 Sync Devices
            devices = Device.query.all()
            for device in devices:
                try:
                    room = Room.query.get(device.room_id)
                    if not room:
                        continue
                    
                    # Generate feed_key
                    feed_key = f"{device.device_type}-device-{device.device_id}".lower()
                    feed_name = f"{room.room_name} {device.device_name}"
                    
                    # Check if mapping exists
                    mapping = AdafruitFeedMapping.query.filter_by(
                        feed_key=feed_key,
                        device_id=device.device_id
                    ).first()
                    if mapping:
                        logger.info(f"✅ Device mapping exists: {feed_key}")
                        continue
                    
                    # Create feed in Adafruit
                    create_adafruit_feed(feed_key, feed_name)
                    
                    # Create mapping for level control
                    mapping = AdafruitFeedMapping(
                        feed_key=feed_key,
                        feed_name=f"home/device/{device.device_id}",
                        device_id=device.device_id,
                        house_id=room.floor.house_id,
                        room_id=room.room_id,
                        feed_type='device',
                        data_key='level',
                        conversion_factor=1.0,
                        is_active=True
                    )
                    db.session.add(mapping)
                    logger.info(f"📡 Created device mapping: {feed_key}")
                except Exception as e:
                    logger.error(f"Error syncing device {device.device_id}: {e}")
                    continue
            
            db.session.commit()
            logger.info("✅ Sync complete!")
            return True
            
    except Exception as e:
        logger.error(f"❌ Sync failed: {e}")
        db.session.rollback()
        return False

def simulate_sensor_data():
    """Simulate sensor data for testing (publish random values to Adafruit)"""
    import random
    
    try:
        with app.app_context():
            # Get all sensor mappings
            mappings = AdafruitFeedMapping.query.filter_by(
                feed_type='sensor',
                is_active=True
            ).all()
            
            for mapping in mappings:
                try:
                    sensor = Sensor.query.get(mapping.sensor_id)
                    if not sensor:
                        continue
                    
                    # Generate realistic values based on sensor type
                    if sensor.sensor_type == 'temperature':
                        value = random.uniform(18, 35)  # 18-35°C
                    elif sensor.sensor_type == 'humidity':
                        value = random.uniform(30, 90)  # 30-90%
                    elif sensor.sensor_type == 'light':
                        value = random.uniform(50, 1000)  # 50-1000 lux
                    elif sensor.sensor_type == 'motion':
                        value = random.choice([0, 1])  # 0 or 1
                    elif sensor.sensor_type == 'co2':
                        value = random.uniform(300, 1000)  # 300-1000 ppm
                    elif sensor.sensor_type == 'pressure':
                        value = random.uniform(980, 1020)  # 980-1020 hPa
                    else:
                        value = random.uniform(0, 100)
                    
                    # Publish to Adafruit
                    topic = f"{ADAFRUIT_USERNAME}/feeds/{mapping.feed_key}"
                    mqtt_client.publish(topic, str(round(value, 2)), qos=1)
                    logger.info(f"📤 Simulated: {mapping.feed_key} = {value:.2f}")
                except Exception as e:
                    logger.error(f"Error simulating sensor {mapping.sensor_id}: {e}")
                    continue
                    
    except Exception as e:
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

# Note: Automation checker thread will be started in main block after app initialization

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
        level = data.get('level', 0)  # 0-100
        
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        old_status = device.status
        old_level = device.level
        
        # Update status if provided
        if status:
            device.status = status
        
        # Update level if valid
        if isinstance(level, int) and 0 <= level <= 100:
            device.level = level
        
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
        
        # ✅ Phase 2: Auto-create Adafruit feed
        try:
            room = Room.query.get(device.room_id)
            if room:
                # Generate feed_key
                feed_key = f"{device.device_type}-device-{device.device_id}".lower()
                feed_name = f"{room.room_name} {device.device_name}"
                
                # Create feed in Adafruit
                create_adafruit_feed(feed_key, feed_name)
                
                # Create mapping
                mapping = AdafruitFeedMapping(
                    feed_key=feed_key,
                    feed_name=f"home/device/{device.device_id}",
                    device_id=device.device_id,
                    house_id=room.floor.house_id,
                    room_id=room.room_id,
                    feed_type='device',
                    data_key='level',
                    conversion_factor=1.0,
                    is_active=True
                )
                db.session.add(mapping)
                logger.info(f"✅ Auto-created Adafruit feed mapping: {feed_key}")
        except Exception as e:
            logger.error(f"⚠️ Failed to auto-create Adafruit feed: {e}")
            # Continue anyway, user can create mapping manually
        
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
        device.level = data.get('level', device.level)
        device.updated_at = datetime.utcnow()
        
        # 🔥 Publish command to Adafruit if status/level changed
        if data.get('status') and data.get('status') != old_status:
            logger.info(f"📤 Status changed: {old_status} → {device.status}")
            publish_device_command(device_id, 'status', device.status)
        
        if data.get('level') is not None and data.get('level') != old_level:
            logger.info(f"📤 Level changed: {old_level} → {device.level}")
            publish_device_command(device_id, 'level', device.level)
        
        db.session.commit()
        
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
        
        # ✅ Phase 2: Auto-create Adafruit feed
        try:
            # Generate feed_key
            feed_key = f"{sensor.sensor_type}-sensor-{sensor.sensor_id}".lower()
            feed_name = f"{room.room_name} {sensor.sensor_name}"
            
            # Create feed in Adafruit
            create_adafruit_feed(feed_key, feed_name)
            
            # Create mapping
            mapping = AdafruitFeedMapping(
                feed_key=feed_key,
                feed_name=f"home/sensor/{sensor.sensor_id}",
                sensor_id=sensor.sensor_id,
                house_id=house.house_id,
                room_id=room.room_id,
                feed_type='sensor',
                conversion_factor=1.0,
                is_active=True
            )
            db.session.add(mapping)
            logger.info(f"✅ Auto-created Adafruit feed mapping: {feed_key}")
        except Exception as e:
            logger.error(f"⚠️ Failed to auto-create Adafruit feed: {e}")
            # Continue anyway, user can create mapping manually
        
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
        action_status = data.get('action_status')
        action_level = data.get('action_level')
        conditions = data.get('conditions')
        
        from automation_service import AutomationService
        
        updated_rule = AutomationService.update_rule(
            rule_id=rule_id,
            rule_name=rule_name,
            logic_type=logic_type,
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
        
        # Query stats from database or calculate on-the-fly
        stats = DashboardStats.query.filter_by(house_id=house_id).first()
        
        if not stats:
            # Calculate stats
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
            
            return jsonify({'success': True, 'stats': stats_dict}), 200
        
        return jsonify({'success': True, 'stats': stats.to_dict()}), 200
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
            'schedules': [{
                'schedule_id': s.schedule_id,
                'device_id': s.device_id,
                'scheduled_time': s.scheduled_time.isoformat(),
                'action_status': s.action_status,
                'action_level': s.action_level,
                'days_of_week': s.days_of_week,
                'is_active': s.is_active,
                'created_at': s.created_at.isoformat()
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
    Body: {scheduled_time: "HH:MM", action_status: "on"|"off", action_level: 0-100, days_of_week: "0,1,2,3,4,5,6"}
    """
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        data = request.json
        scheduled_time = data.get('scheduled_time')  # "14:30"
        action_status = data.get('action_status')
        action_level = data.get('action_level', 0)
        days_of_week = data.get('days_of_week', '0,1,2,3,4,5,6')  # All days by default
        
        if not scheduled_time or action_status not in ['on', 'off']:
            return jsonify({'success': False, 'error': 'Invalid schedule parameters'}), 400
        
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
            reason=f'Created schedule for {scheduled_time}',
            schedule_id=schedule.schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'schedule_id': schedule.schedule_id,
            'message': 'Schedule created successfully'
        }), 201
    except Exception as e:
        logger.error(f"Error creating device schedule: {e}")
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
            schedule.action_level = data['action_level']
        if 'days_of_week' in data:
            schedule.days_of_week = data['days_of_week']
        if 'is_active' in data:
            schedule.is_active = data['is_active']
        
        db.session.commit()
        
        # Log activity
        log = DeviceActivityLog(
            device_id=schedule.device_id,
            user_id=request.user_id,
            action='update_schedule',
            triggered_by='user',
            reason=f'Updated schedule',
            schedule_id=schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Schedule updated'}), 200
    except Exception as e:
        logger.error(f"Error updating schedule: {e}")
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
            reason='Deleted schedule',
            schedule_id=schedule_id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Schedule deleted'}), 200
    except Exception as e:
        logger.error(f"Error deleting schedule: {e}")
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
    
    socketio.run(app, host='0.0.0.0', port=8000, debug=False)
