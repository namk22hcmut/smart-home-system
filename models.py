"""
Database Models for Smart Home Management System
All models with device.level (0-100 scale) defined from the start
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import enum

db = SQLAlchemy()

# =====================================================
# ENUMS FOR ROLES & STATUS
# =====================================================

class UserRole(enum.Enum):
    """User roles for permission management"""
    USER = 'user'          # Regular user - manages their houses/devices
    ADMIN = 'admin'        # Admin - manages all users and system

class UserStatus(enum.Enum):
    """User account status"""
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    DISABLED = 'disabled'

class AccessLevel(enum.Enum):
    """Access level for shared houses"""
    OWNER = 'owner'        # Owner of the house
    MANAGER = 'manager'    # Can manage devices in the house
    VIEWER = 'viewer'      # Read-only access

# =====================================================
# USER & HOUSE MANAGEMENT
# =====================================================

class User(db.Model):
    __tablename__ = 'user'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150))  # Optional full name
    
    # Role-based access
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)
    status = db.Column(db.Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    owned_houses = db.relationship('House', backref='owner', lazy=True, cascade='all, delete-orphan', foreign_keys='House.user_id')
    house_access = db.relationship('UserHouseAccess', backref='user', lazy=True, cascade='all, delete-orphan', foreign_keys='UserHouseAccess.user_id')
    activity_logs = db.relationship('ActivityLog', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username} ({self.role.value})>'
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class House(db.Model):
    __tablename__ = 'house'
    
    house_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    house_name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(300))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    floors = db.relationship('Floor', backref='house', lazy=True, cascade='all, delete-orphan')
    user_access = db.relationship('UserHouseAccess', backref='house', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<House {self.house_name}>'
    
    def to_dict(self):
        return {
            'house_id': self.house_id,
            'house_name': self.house_name,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'created_at': self.created_at.isoformat()
        }


class UserHouseAccess(db.Model):
    """
    Many-to-Many relationship between User and House
    Allows users to share houses with different access levels
    """
    __tablename__ = 'user_house_access'
    
    access_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    house_id = db.Column(db.Integer, db.ForeignKey('house.house_id'), nullable=False)
    access_level = db.Column(db.Enum(AccessLevel), default=AccessLevel.VIEWER, nullable=False)
    sharedBy_user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))  # Who shared it
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint: each user can only have one access level per house
    __table_args__ = (db.UniqueConstraint('user_id', 'house_id', name='unique_user_house'),)
    
    def __repr__(self):
        return f'<UserHouseAccess user_id={self.user_id} house_id={self.house_id} access={self.access_level.value}>'
    
    def to_dict(self):
        return {
            'access_id': self.access_id,
            'user_id': self.user_id,
            'house_id': self.house_id,
            'access_level': self.access_level.value,
            'created_at': self.created_at.isoformat()
        }


class ActivityLog(db.Model):
    """
    Track all system activities for admin monitoring
    """
    __tablename__ = 'activity_log'
    
    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)  # create, update, delete, login, logout, device_control
    resource_type = db.Column(db.String(50))  # user, house, device, sensor
    resource_id = db.Column(db.Integer)
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    status = db.Column(db.String(20))  # success, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ActivityLog {self.action} on {self.resource_type}>'
    
    def to_dict(self):
        return {
            'log_id': self.log_id,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }


# =====================================================
# HOUSE HIERARCHY: FLOOR -> ROOM
# =====================================================

class Floor(db.Model):
    __tablename__ = 'floor'
    
    floor_id = db.Column(db.Integer, primary_key=True)
    house_id = db.Column(db.Integer, db.ForeignKey('house.house_id'), nullable=False)
    floor_name = db.Column(db.String(100), nullable=False)
    floor_number = db.Column(db.Integer)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    rooms = db.relationship('Room', backref='floor', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Floor {self.floor_name}>'


class Room(db.Model):
    __tablename__ = 'room'
    
    room_id = db.Column(db.Integer, primary_key=True)
    floor_id = db.Column(db.Integer, db.ForeignKey('floor.floor_id'), nullable=False)
    room_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    room_type = db.Column(db.String(50))  # bedroom, living_room, kitchen, etc.
    area = db.Column(db.Float)  # in square meters
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    devices = db.relationship('Device', backref='room', lazy=True, cascade='all, delete-orphan')
    sensors = db.relationship('Sensor', backref='room', lazy=True, cascade='all, delete-orphan')
    automation_rules = db.relationship('AutomationRule', backref='room', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Room {self.room_name}>'


# =====================================================
# DEVICES & SENSORS
# =====================================================

class Device(db.Model):
    __tablename__ = 'device'
    
    device_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=False)
    device_name = db.Column(db.String(150), nullable=False)
    device_type = db.Column(db.String(50), nullable=False)  # light, fan, ac, plug, etc.
    status = db.Column(db.String(20), default='off')  # on, off
    level = db.Column(db.Integer, default=0)  # ⭐ 0-100: brightness/speed/power level
    connection_status = db.Column(db.String(20), default='offline')  # online, offline
    last_seen = db.Column(db.DateTime)
    device_model = db.Column(db.String(100))
    mac_address = db.Column(db.String(17))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    histories = db.relationship('DeviceHistory', backref='device', lazy=True, cascade='all, delete-orphan')
    schedules = db.relationship('Schedule', backref='device', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Device {self.device_name}>'


class Sensor(db.Model):
    __tablename__ = 'sensor'
    
    sensor_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=False)
    sensor_name = db.Column(db.String(150), nullable=False)
    sensor_type = db.Column(db.String(50), nullable=False)  # temperature, humidity, motion, light, etc.
    unit = db.Column(db.String(20))  # °C, %, Lux, etc.
    min_value = db.Column(db.Float)
    max_value = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    data = db.relationship('SensorData', backref='sensor', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Sensor {self.sensor_name}>'


class SensorData(db.Model):
    __tablename__ = 'sensor_data'
    
    data_id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensor.sensor_id'), nullable=False)
    value = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SensorData sensor_id={self.sensor_id} value={self.value}>'


# =====================================================
# DEVICE HISTORY & AUTOMATION
# =====================================================

class DeviceHistory(db.Model):
    __tablename__ = 'device_history'
    
    history_id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=False)
    previous_status = db.Column(db.String(20))
    new_status = db.Column(db.String(20))
    previous_level = db.Column(db.Integer)  # Store previous level
    new_level = db.Column(db.Integer)  # Store new level
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    changed_by = db.Column(db.String(100))  # user, mqtt, api, etc.
    
    def __repr__(self):
        return f'<DeviceHistory device_id={self.device_id}>'


class AutomationRule(db.Model):
    __tablename__ = 'automation_rule'
    
    rule_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=False)
    rule_name = db.Column(db.String(150), nullable=False)
    logic_type = db.Column(db.String(20), default='AND')  # AND or OR - how to combine conditions
    action_device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=False)
    action_status = db.Column(db.String(20), nullable=False)  # on, off
    action_level = db.Column(db.Integer, default=0)  # level to set (0-100) when action_status='on'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # 'room' backref comes from Room.automation_rules definition
    # 'automation_rules' backref comes from Device.automation_rules definition
    device = db.relationship('Device', foreign_keys=[action_device_id])
    conditions = db.relationship('RuleCondition', backref='rule', cascade='all, delete-orphan')
    
    def to_dict(self):
        try:
            conditions = [c.to_dict() for c in (self.conditions or [])]
        except Exception as e:
            # Error serializing conditions - return empty list
            print(f"⚠️ Warning: Failed to serialize conditions for rule {self.rule_id}: {e}")
            conditions = []
        
        try:
            created_at_str = self.created_at.isoformat() if self.created_at else None
        except Exception as e:
            print(f"⚠️ Warning: Failed to serialize created_at for rule {self.rule_id}: {e}")
            created_at_str = None
            
        try:
            updated_at_str = self.updated_at.isoformat() if self.updated_at else None
        except Exception as e:
            print(f"⚠️ Warning: Failed to serialize updated_at for rule {self.rule_id}: {e}")
            updated_at_str = None
        
        return {
            'rule_id': self.rule_id,
            'room_id': self.room_id,
            'rule_name': self.rule_name,
            'logic_type': self.logic_type,
            'action_device_id': self.action_device_id,
            'action_status': self.action_status,
            'action_level': self.action_level,
            'is_active': self.is_active,
            'conditions': conditions,
            'created_at': created_at_str,
            'updated_at': updated_at_str
        }
    
    def __repr__(self):
        return f'<AutomationRule {self.rule_name}>'


class RuleCondition(db.Model):
    """Individual condition in an automation rule"""
    __tablename__ = 'rule_condition'
    
    condition_id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('automation_rule.rule_id'), nullable=False)
    sensor_type = db.Column(db.String(100), nullable=False)  # temperature, humidity, light, motion, etc.
    operator = db.Column(db.String(20), nullable=False)  # >, <, >=, <=, ==, !=
    threshold_value = db.Column(db.Float, nullable=False)  # value to compare against
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        try:
            created_at_str = self.created_at.isoformat() if self.created_at else None
        except Exception as e:
            print(f"⚠️ Warning: Failed to serialize created_at for condition {self.condition_id}: {e}")
            created_at_str = None
            
        return {
            'condition_id': self.condition_id,
            'rule_id': self.rule_id,
            'sensor_type': self.sensor_type,
            'operator': self.operator,
            'threshold_value': self.threshold_value,
            'created_at': created_at_str
        }
    
    def __repr__(self):
        return f'<RuleCondition {self.sensor_type} {self.operator} {self.threshold_value}>'


class Schedule(db.Model):
    __tablename__ = 'schedule'
    
    schedule_id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=False)
    scheduled_time = db.Column(db.Time, nullable=False)
    action_status = db.Column(db.String(20))  # on, off
    action_level = db.Column(db.Integer)  # level  to set (0-100)
    days_of_week = db.Column(db.String(50))  # 0-6, comma separated
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Schedule device_id={self.device_id}>'


# =====================================================
# ALERTS & THRESHOLDS
# =====================================================

class ThresholdConfig(db.Model):
    __tablename__ = 'threshold_config'
    
    config_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=True)
    sensor_type = db.Column(db.String(50), nullable=False)
    min_threshold = db.Column(db.Float)
    max_threshold = db.Column(db.Float)
    alert_enabled = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<ThresholdConfig {self.sensor_type}>'


class Alert(db.Model):
    __tablename__ = 'alert'
    
    alert_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=True)
    alert_type = db.Column(db.String(50))  # threshold, offline, etc.
    message = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<Alert {self.alert_type}>'


class DashboardConfig(db.Model):
    __tablename__ = 'dashboard_config'
    
    config_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    preferred_house_id = db.Column(db.Integer)
    theme = db.Column(db.String(20), default='light')  # light, dark
    layout = db.Column(db.String(50))  # custom layout preferences
    
    def __repr__(self):
        return f'<DashboardConfig user_id={self.user_id}>'


# =====================================================
# ENUMS
# =====================================================

class DeviceType(enum.Enum):
    LIGHT = "light"
    FAN = "fan"
    AC = "ac"
    PLUG = "plug"
    HEATER = "heater"
    COOLER = "cooler"

class SensorType(enum.Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    MOTION = "motion"
    LIGHT = "light"
    AIR_QUALITY = "air_quality"
    POWER = "power"

class ConnectionStatus(enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"

class AlertSeverity(enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


# =====================================================
# NOTIFICATIONS (Feature 2)
# =====================================================

class Notification(db.Model):
    __tablename__ = 'notification'
    
    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # device_change, threshold_alert, automation_trigger
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='notifications')
    device = db.relationship('Device', backref='notifications')
    
    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'device_id': self.device_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'read_at': self.read_at.isoformat() if self.read_at else None
        }
    
    def __repr__(self):
        return f'<Notification {self.notification_id}: {self.title}>'


# =====================================================
# DEVICE ACTIVITY LOG (Feature 6: Device Logs & History)
# =====================================================

class DeviceActivityLog(db.Model):
    """
    Track all activities on devices: status changes, level changes, user actions, automation triggers, schedules
    Used for Feature 6: Device Logs & History
    """
    __tablename__ = 'device_activity_log'
    
    log_id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)  # NULL if triggered by automation/schedule
    
    # Action details
    action = db.Column(db.String(50), nullable=False)  # turn_on, turn_off, set_level, toggle
    old_status = db.Column(db.String(20))  # on, off
    new_status = db.Column(db.String(20))
    old_level = db.Column(db.Integer)  # 0-100
    new_level = db.Column(db.Integer)  # 0-100
    
    # Who triggered this action
    triggered_by = db.Column(db.String(50), nullable=False)  # user, automation_rule, schedule, mqtt
    
    # Additional context
    automation_rule_id = db.Column(db.Integer, db.ForeignKey('automation_rule.rule_id'), nullable=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.schedule_id'), nullable=True)
    reason = db.Column(db.String(255))  # Additional info: "User turned on manually", "Automation: Temp > 30"
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    device = db.relationship('Device', backref='activity_logs')
    user = db.relationship('User', backref='device_activity_logs')
    automation_rule = db.relationship('AutomationRule', foreign_keys=[automation_rule_id])
    schedule = db.relationship('Schedule', foreign_keys=[schedule_id])
    
    __table_args__ = (
        db.Index('idx_device_timestamp', 'device_id', 'timestamp'),  # For quick device history lookup
        db.Index('idx_user_timestamp', 'user_id', 'timestamp'),  # For user activity tracking
    )
    
    def to_dict(self):
        return {
            'log_id': self.log_id,
            'device_id': self.device_id,
            'user_id': self.user_id,
            'action': self.action,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'old_level': self.old_level,
            'new_level': self.new_level,
            'triggered_by': self.triggered_by,
            'automation_rule_id': self.automation_rule_id,
            'reason': self.reason,
            'timestamp': self.timestamp.isoformat()
        }
    
    def __repr__(self):
        return f'<DeviceActivityLog device_id={self.device_id} action={self.action}>'


# =====================================================
# DASHBOARD STATISTICS (Feature 1: Dashboard & Statistics)
# =====================================================

class DashboardStats(db.Model):
    """
    Cache dashboard statistics for quick retrieval
    Used for Feature 1: Dashboard & Statistics
    Stats are calculated on-demand and optionally cached
    """
    __tablename__ = 'dashboard_stats'
    
    stat_id = db.Column(db.Integer, primary_key=True)
    house_id = db.Column(db.Integer, db.ForeignKey('house.house_id'), nullable=False)
    
    # Device statistics
    total_devices = db.Column(db.Integer, default=0)
    devices_online = db.Column(db.Integer, default=0)
    devices_offline = db.Column(db.Integer, default=0)
    
    # Device status breakdown
    devices_on = db.Column(db.Integer, default=0)
    devices_off = db.Column(db.Integer, default=0)
    
    # Sensor statistics
    total_sensors = db.Column(db.Integer, default=0)
    
    # Automation statistics
    automation_rules_total = db.Column(db.Integer, default=0)
    automation_rules_active = db.Column(db.Integer, default=0)
    
    # Room breakdown
    total_rooms = db.Column(db.Integer, default=0)
    total_floors = db.Column(db.Integer, default=0)
    
    # Last activity
    last_device_change = db.Column(db.DateTime)  # When device last changed
    
    # Cache metadata
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    house = db.relationship('House', backref='stats')
    
    __table_args__ = (
        db.Index('idx_house_stats', 'house_id'),
    )
    
    def to_dict(self):
        return {
            'stat_id': self.stat_id,
            'house_id': self.house_id,
            'total_devices': self.total_devices,
            'devices_online': self.devices_online,
            'devices_offline': self.devices_offline,
            'devices_on': self.devices_on,
            'devices_off': self.devices_off,
            'total_sensors': self.total_sensors,
            'automation_rules_total': self.automation_rules_total,
            'automation_rules_active': self.automation_rules_active,
            'total_rooms': self.total_rooms,
            'total_floors': self.total_floors,
            'last_device_change': self.last_device_change.isoformat() if self.last_device_change else None,
            'last_updated': self.last_updated.isoformat()
        }
    
    def __repr__(self):
        return f'<DashboardStats house_id={self.house_id}>'


# =====================================================
# ADAFRUIT IO FEED MAPPING
# =====================================================

class AdafruitFeedMapping(db.Model):
    """
    Map Adafruit IO feeds to devices/sensors
    feed_key: Adafruit feed key (e.g., "temperature-sensor-1")
    feed_name: Custom naming (e.g., "home/1/2/5/temperature")
    """
    __tablename__ = 'adafruit_feed_mapping'
    
    mapping_id = db.Column(db.Integer, primary_key=True)
    
    # Adafruit feed key (e.g., "temperature-sensor-1") - used in MQTT topic
    feed_key = db.Column(db.String(255), unique=True, nullable=False)
    
    # Custom feed name for internal organization (e.g., "home/1/2/5/temperature")
    feed_name = db.Column(db.String(255), nullable=True)
    
    # Device/Sensor info
    house_id = db.Column(db.Integer, db.ForeignKey('house.house_id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'), nullable=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensor.sensor_id'), nullable=True)
    
    # Feed type: "sensor" or "device"
    feed_type = db.Column(db.String(50), nullable=False)  # 'sensor' or 'device'
    
    # Data mapping info
    data_key = db.Column(db.String(100))  # For device: 'status' or 'level'
    conversion_factor = db.Column(db.Float, default=1.0)  # Multiply received value by this
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    house = db.relationship('House', backref='adafruit_feeds')
    room = db.relationship('Room', backref='adafruit_feeds')
    device = db.relationship('Device', backref='adafruit_feeds')
    sensor = db.relationship('Sensor', backref='adafruit_feeds')
    
    __table_args__ = (
        db.Index('idx_feed_key', 'feed_key'),
        db.Index('idx_feed_name', 'feed_name'),
        db.Index('idx_device_mapping', 'device_id', 'feed_type'),
        db.Index('idx_sensor_mapping', 'sensor_id', 'feed_type'),
    )
    
    def to_dict(self):
        return {
            'mapping_id': self.mapping_id,
            'feed_key': self.feed_key,
            'feed_name': self.feed_name,
            'house_id': self.house_id,
            'room_id': self.room_id,
            'device_id': self.device_id,
            'sensor_id': self.sensor_id,
            'feed_type': self.feed_type,
            'data_key': self.data_key,
            'conversion_factor': self.conversion_factor,
            'is_active': self.is_active,
        }
    
    def __repr__(self):
        return f'<AdafruitFeedMapping {self.feed_key}>'
