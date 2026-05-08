# 🏠 Smart Home Project - Detailed Overview

**Version:** 3.1 | **Date:** May 9, 2026 | **Status:** ✅ Production Ready

---

## 📌 What is this project?

A complete **IoT Smart Home Management System** with:
- Backend REST API (Flask + SQLAlchemy)
- Mobile app (React Native + Expo)
- Real-time sync via WebSocket & MQTT
- Device control (on/off + level 0-100%)
- Automation rules with multi-condition logic
- 16 database tables in SQLite
- 45+ REST API endpoints

---

## 🎯 Core Features

| Feature | Status | Details |
|---------|--------|---------|
| **REST API** | ✅ | 45+ endpoints for CRUD operations |
| **Device Control** | ✅ | On/Off + Level slider (0-100%) |
| **Real-time Sync** | ✅ | Socket.IO WebSocket updates |
| **Mobile App** | ✅ | React Native + 6 screens |
| **User Auth** | ✅ | JWT authentication |
| **Database** | ✅ | SQLite with 16 tables |
| **MQTT** | ✅ | Adafruit IO integration |
| **Notifications** | ✅ | Real-time system alerts |
| **Automation Rules** | ✅ | Multi-condition AND/OR logic |
| **Admin Panel** | ✅ | User management & stats |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│ Hardware (Raspberry Pi, Sensors, Relays)        │
│ DHT11 | LDR | LED Relay | Fan Relay            │
└──────────────────┬──────────────────────────────┘
                   │ MQTT
                   ▼
    ┌──────────────────────────────┐
    │ Adafruit IO (Cloud MQTT)     │
    │ Feeds: temperature, light... │
    └──────────┬────────────────────┘
               │
         ┌─────┴─────┐
         ▼           ▼
    ┌─────────┐  ┌──────────┐
    │BACKEND  │  │MOBILE    │
    │API      │◄─┤APP       │
    │(8000)   │  │(Expo)    │
    └────┬────┘  └──────────┘
         │
         ▼
    ┌─────────────┐
    │SQLite DB    │
    │16 tables    │
    └─────────────┘
```

---

## 💾 Database Schema (16 Tables)

### Core Tables
```
user (users)
├─ house (houses per user)
│  ├─ floor (floors in house)
│  │  ├─ room (rooms in floor)
│  │  │  ├─ device (smart devices)
│  │  │  │  ├─ id, name, type, status, level (0-100)
│  │  │  │  └─ room_id, created_at, updated_at
│  │  │  └─ sensor (temperature, humidity, etc)
│  │  │     ├─ id, name, type, unit, room_id
│  │  │     └─ sensor_data (historical readings)
│  │  └─ automation_rule
│  │     ├─ id, room_id, name, logic_type (AND/OR)
│  │     ├─ action_type, target_device_id, action_value
│  │     └─ rule_condition (multiple conditions)
│  └─ adafruit_feed_mapping (IoT feed mapping)
│     ├─ feed_name, device_id/sensor_id, conversion_factor
│     └─ feed_type (sensor/control)
└─ notification (real-time alerts)
   ├─ id, title, message, type
   └─ is_read, created_at
```

### Additional Tables
- `device_history` - Device state changes log
- `threshold_config` - Alert thresholds
- `schedule` - Device scheduling
- `dashboard_config` - User preferences
- `alert` - System alerts

---

## 🔌 API Endpoints (45+)

### Authentication (5)
```
POST   /api/register             # Create user
POST   /api/login                # Login
POST   /api/logout               # Logout
GET    /api/user                 # Get current user
POST   /api/token/refresh        # Refresh JWT
```

### Houses (5)
```
GET    /api/houses               # Get all houses
POST   /api/houses               # Create house
GET    /api/houses/{id}          # Get house
PUT    /api/houses/{id}          # Update house
DELETE /api/houses/{id}          # Delete house
```

### Floors (5)
```
GET    /api/houses/{house_id}/floors
POST   /api/floors               # Create floor
GET    /api/floors/{id}          # Get floor
PUT    /api/floors/{id}          # Update floor
DELETE /api/floors/{id}          # Delete floor
```

### Rooms (5)
```
GET    /api/floors/{floor_id}/rooms
POST   /api/rooms                # Create room
GET    /api/rooms/{id}           # Get room
PUT    /api/rooms/{id}           # Update room
DELETE /api/rooms/{id}           # Delete room
```

### Devices (8)
```
GET    /api/devices              # Get all devices
GET    /api/devices/status       # Get with level (0-100%)
GET    /api/devices/{id}         # Get device
POST   /api/devices              # Create device
PUT    /api/devices/{id}         # Update device
DELETE /api/devices/{id}         # Delete device
POST   /api/device-status        # Update status + level
GET    /api/rooms/{room_id}/devices
```

### Sensors (5)
```
POST   /api/sensors              # Create sensor
GET    /api/sensors/{id}         # Get sensor
PUT    /api/sensors/{id}         # Update sensor
DELETE /api/sensors/{id}         # Delete sensor
POST   /api/sensor-data          # Save reading
```

### Real-time (3)
```
GET    /api/sensor-data/latest   # Latest readings
GET    /api/rooms/{id}/sensors   # Sensors with values
POST   /api/socket/subscribe     # WebSocket subscribe
```

### Automation Rules (7)
```
GET    /api/rooms/{room_id}/automation-rules
POST   /api/rooms/{room_id}/automation-rules
GET    /api/automation-rules/{rule_id}
PUT    /api/automation-rules/{rule_id}
DELETE /api/automation-rules/{rule_id}
POST   /api/automation-rules/{rule_id}/toggle
POST   /api/automation-rules/{rule_id}/test
```

### Adafruit Mappings (6)
```
GET    /api/adafruit/mappings
POST   /api/adafruit/mappings
GET    /api/adafruit/mappings/{mapping_id}
PUT    /api/adafruit/mappings/{mapping_id}
DELETE /api/adafruit/mappings/{mapping_id}
POST   /api/adafruit/mappings/sync
```

### Notifications (3)
```
GET    /api/notifications        # Get all notifications
PUT    /api/notifications/{id}/read
DELETE /api/notifications/{id}
```

### Other (2)
```
GET    /api/health               # Health check
GET    /api/admin/stats          # System stats
```

---

## 📱 Mobile App Structure

### Screens (6 Main + 4 Admin)

**Main Screens:**
1. **HomeScreen** - Houses list + Notifications
2. **HousesScreen** - CRUD houses
3. **FloorsScreen** - CRUD floors
4. **RoomsScreen** - CRUD rooms + Sensors
5. **DevicesScreen** - CRUD devices + Control (on/off + slider)
6. **AutomationRulesScreen** - Create/manage automation

**Admin Screens:**
- AdminPanel - Admin dashboard
- UserManagement - Manage users
- SystemStats - System statistics
- ActivityLogs - Device activity

### Context & Services
```
src/
├─ context/
│  └─ AuthContext.js          # Global auth state
├─ screens/                    # 6 main + 4 admin screens
├─ services/
│  ├─ api.js                  # REST API calls
│  ├─ auth.js                 # Authentication
│  ├─ realtime.js             # Socket.IO client
│  └─ notification_socket.js  # WebSocket notifications
└─ components/
   └─ CustomSlider.js         # Device level control
```

---

## 🔐 Configuration

### Backend (.env)
```env
# Flask
FLASK_ENV=development

# Database
DATABASE_URL=sqlite:///smarthome.db

# Security
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret

# Adafruit IoT (REQUIRED!)
ADAFRUIT_USERNAME=your-username
ADAFRUIT_KEY=your-api-key

# Backend URL
BACKEND_API_URL=http://localhost:8000
```

### Mobile (.env.local)
```env
# Backend API URL (choose one):
EXPO_PUBLIC_API_URL=http://localhost:8000/api           # Localhost
# EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api           # LAN
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api          # Android Emulator
# EXPO_PUBLIC_API_URL=http://localhost:8000/api         # iOS Simulator
```

---

## 🚀 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend API** | Flask | 3.0.0 |
| **ORM** | SQLAlchemy | 2.0.49 |
| **Database** | SQLite | Latest |
| **Real-time** | Socket.IO + Flask-SocketIO | Latest |
| **MQTT** | Paho-mqtt | 2.1.0 |
| **Auth** | Flask-JWT-Extended | Latest |
| **Mobile** | React Native + Expo | Latest |
| **Navigation** | React Navigation | 6.x |
| **State** | Context API | Built-in |
| **Python** | 3.9+ | - |
| **Node.js** | 18+ | - |
| **Cloud** | Adafruit IO | - |

---

## 📊 Key Concepts

### Device Level (0-100%)
- **0%** = Device OFF
- **1-99%** = Partial operation (brightness, speed, etc.)
- **100%** = Maximum operation

Example:
- Light: 0% off, 75% = 75% brightness
- Fan: 0% off, 50% = 50% speed

### Automation Rules
```
Rule = Conditions + Action

Example:
IF (temperature > 28°C) AND (humidity < 60%)
THEN turn_on(AC) with level=70%

Supported operators: >, <, >=, <=, ==, !=
Supported logic: AND, OR
Evaluation: Every 30 seconds (background)
```

### Real-time Flow
```
Hardware/Sensor → MQTT → Adafruit IO
                ↓
            Backend (receives MQTT)
                ↓
            WebSocket broadcast
                ↓
            Mobile App (updates UI)
```

### MQTT Topic Format
```
home/[house_id]/[room_id]/[device_id]/[sensor_type]

Example:
home/1/2/5/temperature
↓
House 1, Room 2, Sensor 5 (temperature)
```

---

## 🔄 Main Workflows

### 1. User Login
```
User enters credentials → Backend validates JWT → 
AuthContext updates → App shows Dashboard
```

### 2. Control Device
```
User slides level → Mobile calls /api/device-status → 
Backend updates DB + publishes MQTT → 
Adafruit broadcasts → Hardware responds → 
MQTT message back → WebSocket notifies → UI updates
```

### 3. Automation Execution
```
Background thread checks rules every 30s →
IF conditions met → Trigger action → 
Publish MQTT command → Hardware responds → 
Create notification → Notify user
```

### 4. Real-time Sensor Sync
```
Sensor reads value → Hardware publishes MQTT → 
Backend receives → Stores in DB → 
WebSocket broadcasts to all clients → 
All connected mobiles update UI simultaneously
```

---

## 🌳 Project Files & Purpose

```
app.py                              # Main Flask application + API endpoints
models.py                           # SQLAlchemy ORM models (16 tables)
config.py                           # Configuration & environment setup
automation_service.py               # Automation rules engine
notification_service.py             # Real-time notification system
admin_service.py                    # Admin utilities
seed_database.py                    # Database seeding (test data)

mobile/
├─ app.config.js                    # Expo configuration
├─ App.js                           # Navigation setup
├─ package.json                     # npm dependencies
├─ src/screens/                     # 10 screen components
├─ src/services/                    # API, Auth, Realtime clients
└─ src/context/                     # AuthContext

instance/
└─ smarthome.db                     # SQLite database

requirements.txt                    # Python dependencies
.env.example                        # Backend config template
.gitignore                          # Git ignore rules

Documentation/
├─ README.md                        # Project overview (entry point)
├─ SETUP.md                         # Setup & running guide
├─ PROJECT_COMPREHENSIVE_SUMMARY.md # Full technical documentation
└─ PROJECT_DETAILS.md               # This file
```

---

## 👤 Test User

```
Username: bach
Password: password123
```

---

## 🧪 Quick Tests

### Test Backend Health
```bash
curl http://localhost:8000/api/health
```

### Test Get Houses
```bash
curl http://localhost:8000/api/houses
```

### Test Create Device
```bash
curl -X POST http://localhost:8000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"room_id":1,"device_name":"Light","device_type":"light"}'
```

### Test Device Control
```bash
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id":1,"status":"on","level":75}'
```

---

## 📈 Performance & Scalability

- **Database**: SQLite (good for small-medium, 100-1000 devices)
- **Real-time**: WebSocket connection per client
- **Automation**: Background thread (30s interval)
- **MQTT**: Paho client handles reconnection
- **API**: Flask single-threaded (suitable for <100 concurrent users)

**For production scaling:**
- Migrate DB: PostgreSQL
- Add: Redis for caching
- Add: Kubernetes for scaling
- Add: Load balancer (Nginx/HAProxy)

---

## 🔒 Security Features

✅ JWT authentication with token refresh  
✅ Password hashing (werkzeug)  
✅ CORS enabled (trusted origins)  
✅ Environment variables for secrets (.env)  
✅ HTTPS ready (add SSL cert)  
✅ Input validation on all endpoints  
✅ Rate limiting ready (can add easily)  

---

## 📝 Key Decision Points

1. **SQLite** - Lightweight, file-based, no server needed
2. **Socket.IO** - Real-time communication, fallback to polling
3. **React Native** - Single codebase for iOS/Android
4. **Adafruit IO** - Free MQTT cloud broker for IoT
5. **30s automation check** - Balance between responsiveness & CPU usage
6. **Device level** - Flexible control for different device types

---

## 🚀 Future Enhancements

- Add energy analytics dashboard
- Historical data visualization
- Voice control integration
- Machine learning for automation suggestions
- Mobile app offline support
- Multi-user sharing of houses
- Video stream integration for cameras
- Backup & recovery system

---

**For detailed API documentation:** See PROJECT_COMPREHENSIVE_SUMMARY.md  
**For setup & running:** See SETUP.md  
**For quick overview:** See README.md
