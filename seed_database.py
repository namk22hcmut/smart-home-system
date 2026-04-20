#!/usr/bin/env python
"""
Seed script: Populate database with test data
- Multiple users (admin + regular users with different statuses)
- 5 Houses with floors/rooms/devices
- 100+ Devices with level support
- Sensors
- Activity logs for admin audit trail
"""

from app import app, db
from models import (
    User, House, Floor, Room, Device, Sensor, SensorData,
    DeviceHistory, Alert, ThresholdConfig, AutomationRule, Schedule,
    RuleCondition, UserRole, UserStatus, AccessLevel, UserHouseAccess, ActivityLog,
    DeviceActivityLog
)
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import random

def seed_database():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        print("✅ Database cleared and recreated")
        
        # ====== CREATE MULTIPLE USERS ======
        users_to_create = [
            # Main users
            {'username': 'bach', 'email': 'bach@smarthome.com', 'full_name': 'Bach Nguyen', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'testuser', 'email': 'test@smarthome.com', 'full_name': 'Test User', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            # Admin users
            {'username': 'admin', 'email': 'admin@smarthome.com', 'full_name': 'System Admin', 'role': UserRole.ADMIN, 'status': UserStatus.ACTIVE, 'password': 'admin123'},
            {'username': 'superadmin', 'email': 'superadmin@smarthome.com', 'full_name': 'Super Administrator', 'role': UserRole.ADMIN, 'status': UserStatus.ACTIVE, 'password': 'admin456'},
            # Other regular users
            {'username': 'john_doe', 'email': 'john@example.com', 'full_name': 'John Doe', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'jane_smith', 'email': 'jane@example.com', 'full_name': 'Jane Smith', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'mike_johnson', 'email': 'mike@example.com', 'full_name': 'Mike Johnson', 'role': UserRole.USER, 'status': UserStatus.INACTIVE, 'password': 'password123'},
            {'username': 'sarah_williams', 'email': 'sarah@example.com', 'full_name': 'Sarah Williams', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'tom_brown', 'email': 'tom@example.com', 'full_name': 'Tom Brown', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'emma_davis', 'email': 'emma@example.com', 'full_name': 'Emma Davis', 'role': UserRole.USER, 'status': UserStatus.INACTIVE, 'password': 'password123'},
            {'username': 'alex_miller', 'email': 'alex@example.com', 'full_name': 'Alex Miller', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'lisa_wilson', 'email': 'lisa@example.com', 'full_name': 'Lisa Wilson', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
            {'username': 'chris_taylor', 'email': 'chris@example.com', 'full_name': 'Chris Taylor', 'role': UserRole.USER, 'status': UserStatus.ACTIVE, 'password': 'password123'},
        ]
        
        users = {}
        for user_data in users_to_create:
            password_hash = generate_password_hash(user_data['password'])
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                password_hash=password_hash,
                full_name=user_data['full_name'],
                role=user_data['role'],
                status=user_data['status']
            )
            db.session.add(user)
            db.session.commit()
            users[user_data['username']] = user
            status_str = f"role: {user.role.value}, status: {user.status.value}"
            print(f"✅ User created: {user.username} ({status_str})")
        
        print(f"✅ Total users created: {len(users)}")
        
        # ====== CREATE ACTIVITY LOGS FOR INITIAL SETUP ======
        def add_activity(action, resource_type, description, status='success'):
            log = ActivityLog(
                user_id=users['admin'].user_id,
                action=action,
                resource_type=resource_type,
                description=description,
                ip_address='127.0.0.1',
                status=status,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
            )
            db.session.add(log)
        
        # Log user creation activities
        for username in list(users.keys())[:-3]:  # Log creation of most users
            add_activity(f'user_created', 'user', f'Created user {username}')
        
        # Log some user disable/enable actions
        add_activity('user_disabled', 'user', 'Disabled user: mike_johnson (reason: inactive)')
        add_activity('user_disabled', 'user', 'Disabled user: emma_davis (reason: inactive)')
        
        db.session.commit()
        print(f"✅ Activity logs created")

        
        # Define houses
        houses_data = [
            {'name': 'Downtown Apartment', 'address': '123 Main Street, City Center'},
            {'name': 'Suburban Villa', 'address': '456 Oak Avenue, Suburbs'},
            {'name': 'Cozy Cottage', 'address': '789 Pine Lane, Village'},
            {'name': 'Modern Townhouse', 'address': '321 Elm Street, Modern District'},
            {'name': 'Luxury Penthouse', 'address': '555 Mountain View, Downtown Tower'},
        ]
        
        houses = []
        house_owners = {}  # Track owner for each house
        for idx, house_data in enumerate(houses_data):
            # Assign owner - rotate between bach and testuser
            owner = users['bach'] if idx < 3 else users['testuser']
            house = House(user_id=owner.user_id, house_name=house_data['name'], address=house_data['address'])
            db.session.add(house)
            db.session.commit()
            houses.append(house)
            house_owners[idx] = owner  # Store owner for later use
            print(f"  ✅ House: {house.house_name} (owner: {owner.username})")
        
        # Create floors and rooms for each house
        room_types = ['Living Room', 'Kitchen', 'Master Bedroom', 'Bathroom', 'Guest Room', 'Office', 'Garage']
        
        all_devices = []
        device_types_config = {
            'light': {'name': 'Main Light', 'default_level': 75},
            'fan': {'name': 'Ceiling Fan', 'default_level': 50},
            'tv': {'name': 'Smart TV', 'default_level': 100},
            'ac': {'name': 'Air Conditioner', 'default_level': 70},
            'plug': {'name': 'Smart Plug', 'default_level': 100},
        }
        
        for house in houses:
            # Create 2-3 floors
            num_floors = 2 if house.house_id < 4 else 1
            for floor_num in range(1, num_floors + 1):
                floor = Floor(house_id=house.house_id, floor_name=f'Floor {floor_num}', floor_number=floor_num)
                db.session.add(floor)
                db.session.commit()
                print(f"    ✅ Floor: {floor.floor_name}")
                
                # Create 4-5 rooms per floor
                rooms_per_floor = room_types[:5] if floor_num == 1 else room_types[3:6]
                for room_name in rooms_per_floor:
                    room = Room(floor_id=floor.floor_id, room_name=room_name, description=f'{room_name} in {house.house_name}')
                    db.session.add(room)
                    db.session.commit()
                    print(f"      ✅ Room: {room.room_name}")
                    
                    # Create 2-5 devices per room
                    num_devices = 3 if room_name == 'Living Room' else 2
                    for dev_idx in range(num_devices):
                        # Rotate through device types
                        dev_types = list(device_types_config.keys())
                        dev_type = dev_types[dev_idx % len(dev_types)]
                        dev_config = device_types_config[dev_type]
                        
                        device = Device(
                            room_id=room.room_id,
                            device_name=f'{dev_config["name"]} {dev_idx + 1}',
                            device_type=dev_type,
                            status='on' if dev_idx == 0 else 'off',
                            level=dev_config['default_level'] if dev_idx == 0 else 0,  # ⭐ Level set!
                            mac_address=f'00:1A:2B:3C:{dev_idx:02d}:{room.room_id:02d}'
                        )
                        db.session.add(device)
                        db.session.commit()
                        all_devices.append(device)
                        
                    # Create sensors in room
                    sensors = [
                        {'name': 'Temperature', 'type': 'temperature', 'unit': '°C'},
                        {'name': 'Humidity', 'type': 'humidity', 'unit': '%'},
                    ]
                    room_sensors = []
                    for sensor_data in sensors:
                        sensor = Sensor(
                            room_id=room.room_id,
                            sensor_name=sensor_data['name'],
                            sensor_type=sensor_data['type'],
                            unit=sensor_data['unit']
                        )
                        db.session.add(sensor)
                        db.session.flush()
                        room_sensors.append(sensor)
                    
                    # Add sample sensor data for automation rules testing
                    # For first room in first house: add hot + humid readings to trigger Smart Fan rule
                    if not hasattr(seed_database, '_first_room_sensors_added'):
                        for sensor in room_sensors:
                            if sensor.sensor_type == 'temperature':
                                # Add reading: 32°C (above 30 threshold)
                                sensor_reading = SensorData(
                                    sensor_id=sensor.sensor_id,
                                    value=32.5,
                                    timestamp=datetime.utcnow()
                                )
                                db.session.add(sensor_reading)
                            elif sensor.sensor_type == 'humidity':
                                # Add reading: 85% (above 80 threshold)
                                sensor_reading = SensorData(
                                    sensor_id=sensor.sensor_id,
                                    value=85.0,
                                    timestamp=datetime.utcnow()
                                )
                                db.session.add(sensor_reading)
                        seed_database._first_room_sensors_added = True
                    
                    db.session.commit()
        
        print(f"\n✅ Total devices created: {len(all_devices)}")
        
        # ====== SHARE HOUSES WITH OTHER USERS ======
        sharing_relationships = [
            # House 0 (Downtown Apartment - owned by bach)
            {'house_idx': 0, 'user': 'testuser', 'access': AccessLevel.MANAGER},
            {'house_idx': 0, 'user': 'john_doe', 'access': AccessLevel.VIEWER},
            {'house_idx': 0, 'user': 'jane_smith', 'access': AccessLevel.VIEWER},
            # House 1 (Suburban Villa - owned by bach)
            {'house_idx': 1, 'user': 'testuser', 'access': AccessLevel.VIEWER},
            {'house_idx': 1, 'user': 'sarah_williams', 'access': AccessLevel.MANAGER},
            {'house_idx': 1, 'user': 'tom_brown', 'access': AccessLevel.VIEWER},
            # House 2 (Cozy Cottage - owned by bach)
            {'house_idx': 2, 'user': 'alex_miller', 'access': AccessLevel.MANAGER},
            {'house_idx': 2, 'user': 'lisa_wilson', 'access': AccessLevel.VIEWER},
            # House 3 (Modern Townhouse - owned by testuser)
            {'house_idx': 3, 'user': 'bach', 'access': AccessLevel.MANAGER},
            {'house_idx': 3, 'user': 'chris_taylor', 'access': AccessLevel.VIEWER},
            # House 4 (Luxury Penthouse - owned by testuser)
            {'house_idx': 4, 'user': 'bach', 'access': AccessLevel.VIEWER},
        ]
        
        shared_count = 0
        for share_data in sharing_relationships:
            house = houses[share_data['house_idx']]
            user = users[share_data['user']]
            owner = house_owners[share_data['house_idx']]  # Get owner from our tracking dict
            
            share = UserHouseAccess(
                user_id=user.user_id,
                house_id=house.house_id,
                access_level=share_data['access'],
                sharedBy_user_id=owner.user_id
            )
            db.session.add(share)
            db.session.commit()
            shared_count += 1
            
            # Log the house sharing activity
            add_activity(
                'house_shared',
                'house',
                f'Shared "{house.house_name}" with {user.username} ({share_data["access"].value} access)'
            )
        
        print(f"✅ House sharing configured: {shared_count} relationships")
        
        # ====== LOG MORE ACTIVITIES ======
        # Log role change
        add_activity('user_role_changed', 'user', 'Changed role: john_doe (user -> admin)')
        add_activity('user_role_changed', 'user', 'Changed role: jane_smith (admin -> user)')
        
        # Log stats views
        for _ in range(5):
            add_activity('stats_viewed', 'system', 'Viewed system statistics')
        
        # Log user interactions
        add_activity('user_enabled', 'user', 'Enabled user: mike_johnson')
        add_activity('user_deleted', 'user', 'Deleted user: test_account (reason: test user)')
        
        db.session.commit()
        print(f"✅ Activity logs created")
        
        # ====== CREATE AUTOMATION RULES ======
        from models import RuleCondition
        
        # Get first house and its room
        first_house = houses[0] if houses else None
        
        automation_rules_created = 0
        
        if first_house:
            floors = Floor.query.filter_by(house_id=first_house.house_id).all()
            first_floor = floors[0]
            rooms = Room.query.filter_by(floor_id=first_floor.floor_id).all()
            
            if rooms:
                first_room = rooms[0]
                devices = Device.query.filter_by(room_id=first_room.room_id).all()
                
                if len(devices) >= 2:
                    # Rule 1: Smart Fan - IF (Temperature > 30 AND Humidity > 80) THEN Turn ON Fan
                    fan_device = devices[0]
                    rule1 = AutomationRule(
                        room_id=first_room.room_id,
                        rule_name='Smart Fan - High Heat & Humidity',
                        logic_type='AND',
                        action_device_id=fan_device.device_id,
                        action_status='on',
                        action_level=80,
                        is_active=True
                    )
                    db.session.add(rule1)
                    db.session.flush()
                    
                    # Add conditions for Rule 1
                    cond1 = RuleCondition(
                        rule_id=rule1.rule_id,
                        sensor_type='temperature',
                        operator='>',
                        threshold_value=30.0
                    )
                    cond2 = RuleCondition(
                        rule_id=rule1.rule_id,
                        sensor_type='humidity',
                        operator='>',
                        threshold_value=80.0
                    )
                    db.session.add(cond1)
                    db.session.add(cond2)
                    automation_rules_created += 1
                    
                    # Rule 2: Bright Light - IF Temperature < 15 OR Motion detected THEN Turn ON Light
                    light_device = devices[1] if len(devices) > 1 else devices[0]
                    rule2 = AutomationRule(
                        room_id=first_room.room_id,
                        rule_name='Smart Light - Cold or Motion',
                        logic_type='OR',
                        action_device_id=light_device.device_id,
                        action_status='on',
                        action_level=100,
                        is_active=True
                    )
                    db.session.add(rule2)
                    db.session.flush()
                    
                    # Add conditions for Rule 2
                    cond3 = RuleCondition(
                        rule_id=rule2.rule_id,
                        sensor_type='temperature',
                        operator='<',
                        threshold_value=15.0
                    )
                    cond4 = RuleCondition(
                        rule_id=rule2.rule_id,
                        sensor_type='motion',
                        operator='==',
                        threshold_value=1.0
                    )
                    db.session.add(cond3)
                    db.session.add(cond4)
                    automation_rules_created += 1
                    
                    # Rule 3: Energy Saver - IF Light level > 500 Lux THEN Turn OFF Light (disabled by default)
                    rule3 = AutomationRule(
                        room_id=first_room.room_id,
                        rule_name='Energy Saver - Bright Enough',
                        logic_type='AND',
                        action_device_id=light_device.device_id,
                        action_status='off',
                        action_level=0,
                        is_active=False
                    )
                    db.session.add(rule3)
                    db.session.flush()
                    
                    cond5 = RuleCondition(
                        rule_id=rule3.rule_id,
                        sensor_type='light',
                        operator='>',
                        threshold_value=500.0
                    )
                    db.session.add(cond5)
                    automation_rules_created += 1
        
        db.session.commit()
        print(f"✅ Automation rules created: {automation_rules_created}")
        
        # ====== SEED DEVICE SCHEDULES ======
        print("\n📅 Seeding device schedules...")
        schedules_created = 0
        
        # Create schedules for some devices in first house
        if houses:
            first_house = houses[0]
            first_floor = first_house.floors[0] if first_house.floors else None
            
            if first_floor and first_floor.rooms:
                first_room = first_floor.rooms[0]
                
                # Get some devices from this room
                devices_in_room = [d for d in first_room.devices if d][:3]
                
                if devices_in_room:
                    # Schedule 1: Turn on light at 7:00 AM (weekdays)
                    light_device = devices_in_room[0]
                    from datetime import time
                    
                    sched1 = Schedule(
                        device_id=light_device.device_id,
                        scheduled_time=time(7, 0),
                        action_status='on',
                        action_level=100,
                        days_of_week='1,2,3,4,5',  # Mon-Fri
                        is_active=True
                    )
                    db.session.add(sched1)
                    schedules_created += 1
                    
                    # Schedule 2: Turn off light at 9:00 PM (weekends)
                    sched2 = Schedule(
                        device_id=light_device.device_id,
                        scheduled_time=time(21, 0),
                        action_status='off',
                        action_level=0,
                        days_of_week='0,6',  # Sat-Sun
                        is_active=True
                    )
                    db.session.add(sched2)
                    schedules_created += 1
                    
                    # Schedule 3: Turn on fan at 12:00 PM (everyday)
                    if len(devices_in_room) > 1:
                        fan_device = devices_in_room[1]
                        sched3 = Schedule(
                            device_id=fan_device.device_id,
                            scheduled_time=time(12, 0),
                            action_status='on',
                            action_level=50,
                            days_of_week='0,1,2,3,4,5,6',  # Every day
                            is_active=True
                        )
                        db.session.add(sched3)
                        schedules_created += 1
                        
                        # Schedule 4: Turn off fan at 5:00 PM (everyday)
                        sched4 = Schedule(
                            device_id=fan_device.device_id,
                            scheduled_time=time(17, 0),
                            action_status='off',
                            action_level=0,
                            days_of_week='0,1,2,3,4,5,6',  # Every day
                            is_active=True
                        )
                        db.session.add(sched4)
                        schedules_created += 1
                    
                    # Schedule 5: Turn on AC at 6:00 AM (weekdays only)
                    if len(devices_in_room) > 2:
                        ac_device = devices_in_room[2]
                        sched5 = Schedule(
                            device_id=ac_device.device_id,
                            scheduled_time=time(6, 0),
                            action_status='on',
                            action_level=22,  # 22°C target
                            days_of_week='1,2,3,4,5',  # Mon-Fri
                            is_active=True
                        )
                        db.session.add(sched5)
                        schedules_created += 1
                        
                        # Schedule 6: Turn off AC at 6:00 PM (weekdays only)
                        sched6 = Schedule(
                            device_id=ac_device.device_id,
                            scheduled_time=time(18, 0),
                            action_status='off',
                            action_level=0,
                            days_of_week='1,2,3,4,5',  # Mon-Fri
                            is_active=False  # Disabled by default
                        )
                        db.session.add(sched6)
                        schedules_created += 1
        
        db.session.commit()
        print(f"✅ Device schedules created: {schedules_created}")
        
        # ====== SEED ACTIVITY LOGS ======
        print("\n📋 Seeding device activity logs...")
        from models import DeviceActivityLog
        
        activity_logs_created = 0
        now = datetime.utcnow()
        
        # Get first automation rule for reference
        first_rule = AutomationRule.query.first()
        
        # Create sample activity logs for all devices
        for device in all_devices[:20]:  # Log activities for first 20 devices
            # Log 1: User turned on 2 hours ago
            log1 = DeviceActivityLog(
                device_id=device.device_id,
                user_id=users['bach'].user_id,
                action='turn_on',
                old_status='off',
                new_status='on',
                old_level=0,
                new_level=75,
                triggered_by='user',
                reason='User turned on manually',
                timestamp=now - timedelta(hours=2)
            )
            db.session.add(log1)
            activity_logs_created += 1
            
            # Log 2: Automation turned it off 1 hour ago
            if first_rule:
                log2 = DeviceActivityLog(
                    device_id=device.device_id,
                    action='turn_off',
                    old_status='on',
                    new_status='off',
                    old_level=75,
                    new_level=0,
                    triggered_by='automation_rule',
                    automation_rule_id=first_rule.rule_id,
                    reason='Automation triggered: Temperature > 30°C AND Humidity > 80%',
                    timestamp=now - timedelta(hours=1)
                )
                db.session.add(log2)
                activity_logs_created += 1
            
            # Log 3: User adjusted level 30 minutes ago
            log3 = DeviceActivityLog(
                device_id=device.device_id,
                user_id=users['bach'].user_id,
                action='set_level',
                old_status='off',
                new_status='on',
                old_level=0,
                new_level=50,
                triggered_by='user',
                reason='User adjusted device level to 50%',
                timestamp=now - timedelta(minutes=30)
            )
            db.session.add(log3)
            activity_logs_created += 1
            
            # Log 4: MQTT update 10 minutes ago
            log4 = DeviceActivityLog(
                device_id=device.device_id,
                action='turn_on',
                old_status='off',
                new_status='on',
                old_level=50,
                new_level=100,
                triggered_by='mqtt',
                reason='Status synced from Adafruit IO',
                timestamp=now - timedelta(minutes=10)
            )
            db.session.add(log4)
            activity_logs_created += 1
        
        db.session.commit()
        print(f"✅ Activity logs created: {activity_logs_created}")
        
        print("✅ Database seeded successfully!")
        print("\nSummary:")
        print(f"  - Users: {len(users)} (including admins)")
        print(f"  - Active Users: {sum(1 for u in users.values() if u.status == UserStatus.ACTIVE)}")
        print(f"  - Admin Users: {sum(1 for u in users.values() if u.role == UserRole.ADMIN)}")
        print(f"  - Houses: {len(houses)}")
        print(f"  - Schedules: {schedules_created}")
        print(f"  - Activity Logs: {activity_logs_created}")
        print(f"  - Automation Rules: {automation_rules_created}")
        print(f"  - House shares: {shared_count}")
        print(f"  - Devices: {len(all_devices)} (all with level: 0-100)")
        print(f"  - Sensors: {len(all_devices) * 2} (temperature, humidity)")
        print("\nTest Credentials (ACTIVE):")
        print(f"  - User: bach / password123")
        print(f"  - User: testuser / password123")
        print(f"  - User: john_doe / password123")
        print(f"  - Admin: admin / admin123")
        print(f"  - Admin: superadmin / admin456")
        print("\nTest Credentials (INACTIVE):")
        print(f"  - User: mike_johnson / password123")
        print(f"  - User: emma_davis / password123")

if __name__ == '__main__':
    seed_database()

