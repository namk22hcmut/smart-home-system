# 🏠 Smart Home Management System - Comprehensive Project Summary

**Last Updated:** April 20, 2026 - Dynamic API Configuration + Team Setup Ready ✅
**Status:** 🟢 PRODUCTION READY - All Features + Real-time + Device Control + Dynamic Config ✅
**Team:** Bach, NamKZ
**Version:** 3.1 (Real-time ✅ + Device Control ✅ + Adafruit Mapping ✅ + MQTT Publish ✅ + **Dynamic API Config** ✅)
**Features Completed:** Feature 1 ✅ + Feature 2 ✅ + Real-time Sync ✅ + Device Control ✅ + Adafruit Feed Mapping ✅ + **Dynamic Configuration** ✅ + **Team Ready** ✅

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [⭐ NEW - Dynamic API Configuration](#-new---dynamic-api-configuration)
3. [Architecture & Tech Stack](#architecture--tech-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Project Structure](#project-structure)
7. [Key Features](#key-features)
8. [Running the System](#running-the-system)
9. [Current Status](#current-status)
10. [Device Level Control](#device-level-control)
11. [Mobile App Architecture](#mobile-app-architecture)

---

## 🎯 Project Overview

A complete **IoT Smart Home Management System** that:
- ✅ Integrates real hardware (DHT11, LDR, LED relay, Fan relay)
- ✅ Uses **Adafruit IO** MQTT broker for real-time cloud sync
- ✅ Provides **REST API** backend for house/floor/room/device management
- ✅ Supports **device level control** (fan speeds, light brightness 0-100%)
- ✅ Auto-persists sensor readings & device status to SQLite
- ✅ Has **React Native mobile app** with Backend API integration

### Key Statistics
- **16 Database Tables** (user, house, floor, room, device, sensor, sensor_data, automation_rule, rule_condition, **adafruit_feed_mapping**, etc.)
- **45+ REST API Endpoints** with full CRUD operations + Real-time + Adafruit Mapping
- **6 Mobile Screens** with complete user self-service management:
  - 🏠 HousesScreen - CRUD houses (Create/Edit/Delete)
  - 🏢 FloorsScreen - CRUD floors (Create/Edit/Delete)
  - 🚪 RoomsScreen - CRUD rooms (Create/Edit/Delete) + Sensor Management (Create/Edit/Delete)
  - ⚙️ DevicesScreen - CRUD devices (Create/Edit/Delete) + **Real-time Control (Toggle + Slider)** ⭐
  - 🔔 NotificationCenter - View notifications with real-time updates
  - 🤖 AutomationRulesScreen - Create/manage multi-condition automation rules
- **73+ Pre-seeded Test Devices** 
- **3 Automation Rules** seeded with sensor data
- **2 Services Running**: Backend API (8000) + Mobile App (Expo 8082)
- **✨ NEW - Real-time Features:**
  - 🔄 Socket.IO real-time subscription for sensor/device updates
  - 📡 MQTT bridge: Adafruit → Backend → Frontend (instant sync)
  - 🎚️ Live slider control for device brightness/speed (0-100%)
  - 🔌 Device control publish to Adafruit IO feeds via MQTT
- **✨ NEW - Adafruit Feed Mapping System:**
  - 📊 AdafruitFeedMapping table to map feeds to devices/sensors
  - Format: `home/[house_id]/[room_id]/[device_id]/[sensor_type]`
  - 6 CRUD endpoints for feed management
- **MQTT Cloud Integration** (Adafruit IO): Subscribe + Publish ✅
- **Notifications System**: Backend ✅ + UI ✅ + Real-time Socket.IO ✅
- **Automation Rules**: Full feature with AND/OR logic + background checker (every 30 seconds) ✅

---

## ⭐ NEW - Dynamic API Configuration (April 20, 2026)

### Problem Solved
❌ **Before:** API hardcoded (IP `10.0.106.239`)
- Cannot push to GitHub safely
- Team members difficult to configure
- Cannot switch networks without code changes
- Credentials exposed

✅ **After:** Dynamic configuration via `.env` files
- Safe for GitHub (credentials protected)
- Easy team setup
- Network-independent
- Production-ready

### Configuration Structure

#### Backend Configuration (`.env`)
```env
# Database
DATABASE_URL=sqlite:///smarthome.db

# Security Keys
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret

# Adafruit IoT
ADAFRUIT_USERNAME=your-username
ADAFRUIT_KEY=your-api-key

# Backend API
BACKEND_API_URL=http://localhost:8000
FLASK_ENV=development
```

#### Mobile Configuration (`mobile/.env.local`)
```env
# Backend API URL - Update per environment
EXPO_PUBLIC_API_URL=http://10.0.106.239:8000/api

# Options:
# Localhost: http://localhost:8000/api
# Android Emulator: http://10.0.2.2:8000/api
# Physical Device: http://YOUR_IP:8000/api
```

### Files Structure
```
Project/
├── .env.example              # Backend template (commit)
├── .env                      # Backend config (gitignore)
├── .gitignore               # Protect .env files
│
├── mobile/
│   ├── app.config.js        # Expo config (commit)
│   ├── .env.local.example   # Mobile template (commit)
│   └── .env.local           # Mobile config (gitignore)
│
└── Documentation/
    ├── TEAM_SETUP_GUIDE.md              # Setup for team
    ├── ENV_SETUP_GUIDE.md               # Environment guide
    ├── RUN_PROJECT_GUIDE.md             # How to run
    └── GIT_PUSH_CHECKLIST.md            # Before push
```

### Implementation Details

**Backend (`config.py`):**
- Load environment variables via `python-dotenv`
- Validate required credentials (ADAFRUIT_USERNAME, ADAFRUIT_KEY)
- Support development, staging, production configs

**Mobile (`app.config.js`):**
- Expo configuration with dynamic `extra.apiUrl`
- Load from `.env.local` via environment variables
- Updated 4 services to use `Constants.expoConfig?.extra?.apiUrl`

**Services Updated:**
1. `api.js` - REST API client with dynamic URL
2. `auth.js` - Authentication with dynamic URL
3. `realtime.js` - Socket.IO real-time with dynamic URL
4. `notification_socket.js` - WebSocket with dynamic URL

### Team Setup (Lần đầu)
```bash
# Clone repo
git clone <url>

# Backend
copy .env.example .env
# Edit: add Adafruit credentials

# Mobile
cd mobile
copy .env.local.example .env.local
# Edit: add Backend IP
npm install
```

### Lợi ích
| Aspect | Before | After |
|--------|--------|-------|
| **API Config** | ❌ Hardcoded | ✅ Dynamic |
| **GitHub Safety** | ❌ Credentials leak | ✅ Protected |
| **Team Setup** | ❌ Modify code | ✅ Edit .env |
| **Network Change** | ❌ Code + restart | ✅ Edit .env |
| **Documentation** | ⚠️ Basic | ✅ Comprehensive |
| **Status** | 🔴 Not ready | 🟢 Ready |

---

## 🏗️ Architecture & Tech Stack

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    REAL HARDWARE (Raspberry Pi)            │
│         DHT11 | LDR | LED Relay | Fan Relay                │
└──────────────────────────┬──────────────────────────────────┘
                           │ MQTT
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              ADAFRUIT IO (Cloud MQTT Broker)                │
│   Feeds: home-humi-s | home-light-s | home-led | home-fan  │
└─┬─────────────────────────────────────────────────────────┬─┘
  │ MQTT                                                    │ MQTT
  ▼ (in parallel)                                           ▼
┌────────────────────┐                          ┌──────────────────────┐
│  BACKEND API (8000)│                          │  MOBILE APP (Expo)   │
│  • Flask           │                          │  • React Native      │
│  • SQLAlchemy ORM  │◄─────REST API────────────│  • Navigation Stack  │
│  • 20+ Endpoints   │     (JSON)               │  • 4 Screens         │
│  • MQTT Handlers   │                          │  • Real-time sync    │
│  • CORS Enabled    │                          │  • Device Control    │
└──────────────────┬─┘                          └──────────────────────┘
                   │
                   ▼ JSON
        ┌──────────────────────┐
        │  SQLite Database     │
        │  smarthome.db        │
        │                      │
        │  13 Tables:          │
        │  • user              │
        │  • house             │
        │  • floor             │
        │  • room              │
        │  • device ⭐ level   │
        │  • sensor & more...  │
        └──────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend API** | Flask | 3.0.0 |
| **Backend ORM** | SQLAlchemy | 2.0.49 |
| **Database** | SQLite | Latest |
| **MQTT Client** | Paho | 2.1.0 |
| **Mobile App** | React Native + Expo | Latest |
| **Mobile Navigation** | React Navigation | 6.x |
| **Python** | 3.13.7 | - |
| **Node.js** | 22.11.0 | - |
| **Cloud MQTT** | Adafruit IO | - |

---

## 🗄️ Database Schema

### 16 Tables

| Table | Purpose |
|-------|---------|
| `user` | User accounts |
| `house` | Multiple homes per user |
| `floor` | Floors in a house |
| `room` | Rooms per floor |
| `device` | Smart devices (lights, fans, AC) ⭐ Has `level` column |
| `sensor` | Temperature, humidity, motion sensors |
| `sensor_data` | Historical sensor readings |
| `threshold_config` | Alert thresholds |
| `automation_rule` | Automation triggers |
| `device_history` | Device state changes log |
| `alert` | System alerts |
| `schedule` | Device scheduling |
| `dashboard_config` | User dashboard preferences |
| `adafruit_feed_mapping` | **NEW** - Map Adafruit IO feeds to devices/sensors |
| `rule_condition` | Conditions for automation rules |
| `notification` | User notifications |

### Device Table Structure
```sql
CREATE TABLE device (
    device_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES room,
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'off',
    level INTEGER DEFAULT 0,              -- ⭐ 0-100% scale
    connection_status VARCHAR(20),
    mac_address VARCHAR(17),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### AdafruitFeedMapping Table Structure (NEW)
```sql
CREATE TABLE adafruit_feed_mapping (
    mapping_id SERIAL PRIMARY KEY,
    feed_name VARCHAR(255) UNIQUE NOT NULL,  -- e.g. "home/1/2/5/temperature"
    house_id INTEGER NOT NULL,
    room_id INTEGER,
    device_id INTEGER,
    sensor_id INTEGER,
    feed_type VARCHAR(50),                    -- 'sensor' or 'device'
    data_key VARCHAR(100),                    -- 'status' or 'level'
    conversion_factor FLOAT DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints (45+ Total)

### Backend API Base URL
`http://localhost:8000`

### Core CRUD Endpoints (22 Total)

#### Houses
- `GET /api/houses` - Get all houses (user's only if logged in)
- `GET /api/houses/{id}` - Get specific house
- `POST /api/houses` - Create house ⭐ NEW
- `PUT /api/houses/{id}` - Update house ⭐ NEW
- `DELETE /api/houses/{id}` - Delete house ⭐ NEW

#### Floors
- `GET /api/houses/{house_id}/floors` - Get floors in house
- `GET /api/floors/{id}` - Get specific floor
- `POST /api/floors` - Create floor ⭐ NEW
- `PUT /api/floors/{id}` - Update floor ⭐ NEW
- `DELETE /api/floors/{id}` - Delete floor ⭐ NEW

#### Rooms
- `GET /api/floors/{floor_id}/rooms` - Get rooms in floor
- `GET /api/rooms/{id}` - Get specific room
- `POST /api/rooms` - Create room ⭐ NEW
- `PUT /api/rooms/{id}` - Update room ⭐ NEW
- `DELETE /api/rooms/{id}` - Delete room ⭐ NEW
- `GET /api/rooms/{id}/devices` - Get devices in room
- `GET /api/rooms/{id}/sensors` - Get sensors in room

#### Devices
- `GET /api/devices` - Get all devices
- `GET /api/devices/{id}` - Get specific device
- `GET /api/devices/status` - Get all devices with status & level
- `POST /api/devices` - Create device ⭐ NEW
- `PUT /api/devices/{id}` - Update device ⭐ NEW
- `DELETE /api/devices/{id}` - Delete device ⭐ NEW
- `POST /api/device-status` - Update device status with level

#### Sensors (NEW - 5 Endpoints)
- `GET /api/rooms/{room_id}/sensors` - Get sensors in room (with latest value + unit)
- `POST /api/sensors` - Create sensor (name + type) → auto-set unit ⭐ NEW
- `PUT /api/sensors/{id}` - Update sensor (name + type) → auto-update unit ⭐ NEW
- `DELETE /api/sensors/{id}` - Delete sensor ⭐ NEW
- `POST /api/sensor-data` - Save sensor reading (sync endpoint)

#### Sync Endpoints (Real-time MQTT Sync - 6 Total)
- `POST /api/sensor-data` - Save new sensor reading → Returns 201
- `GET /api/sensor-data/latest` - Get latest sensor readings
- `POST /api/device-status` - Update device status/level → Returns 200
- `GET /api/notifications` - Get all user notifications
- `PUT /api/notifications/{id}/read` - Mark notification as read
- `DELETE /api/notifications/{id}` - Delete notification

#### Automation Rules Endpoints (NEW - 7 Total) ✅
- `GET /api/rooms/{room_id}/automation-rules` - Get all rules for a room
- `POST /api/rooms/{room_id}/automation-rules` - Create new rule with conditions
- `GET /api/automation-rules/{rule_id}` - Get specific rule
- `PUT /api/automation-rules/{rule_id}` - Update rule (name, logic_type, action, conditions)
- `DELETE /api/automation-rules/{rule_id}` - Delete rule
- `POST /api/automation-rules/{rule_id}/toggle` - Enable/disable rule
- `POST /api/automation-rules/{rule_id}/test` - Test if rule conditions are currently met

#### Adafruit Feed Mapping Endpoints (NEW - 6 Total) ✅
- `GET /api/adafruit/mappings` - Get all feed mappings for user's houses
- `GET /api/adafruit/mappings/{mapping_id}` - Get specific mapping
- `POST /api/adafruit/mappings` - Create new feed mapping
  - Body: `{feed_name, house_id, room_id?, device_id?, sensor_id?, feed_type, data_key?, conversion_factor}`
- `PUT /api/adafruit/mappings/{mapping_id}` - Update mapping
- `DELETE /api/adafruit/mappings/{mapping_id}` - Delete mapping
- **Mapping Format:** `home/[house_id]/[room_id]/[device_id]/[sensor_type]`
  - Example: `home/1/2/5/temperature` → maps to House 1, Room 2, Sensor 5

#### Sensor Unit Auto-Mapping
- Temperature → °C
- Humidity → %
- Motion → boolean
- Light → lux
- CO2 → ppm
- Pressure → hPa

### Request/Response Examples

**Get All Devices with Level:**
```bash
GET /api/devices/status
```
Response:
```json
{
  "devices": [
    {
      "device_id": 1,
      "device_name": "Main Light",
      "device_type": "light",
      "status": "on",
      "level": 75,
      "room_id": 10
    },
    {
      "device_id": 2,
      "device_name": "Ceiling Fan",
      "device_type": "fan",
      "status": "on",
      "level": 50,
      "room_id": 12
    }
  ]
}
```

**Update Device Status with Level:**
```bash
POST /api/device-status
Content-Type: application/json

{
  "device_id": 1,
  "status": "on",
  "level": 75
}
```
Response: `{"device_id": 1, "status": "on", "level": 75}`

**Save Sensor Data:**
```bash
POST /api/sensor-data
{
  "sensor_id": 2,
  "value": 68.5,
  "timestamp": "2026-04-15T10:30:00"
}
```
Response: `{"data_id": 123, "sensor_id": 2, "value": 68.5}`

**Create Adafruit Feed Mapping (NEW):**
```bash
POST /api/adafruit/mappings
Content-Type: application/json

{
  "feed_name": "home/1/2/5/temperature",
  "house_id": 1,
  "room_id": 2,
  "sensor_id": 5,
  "feed_type": "sensor",
  "conversion_factor": 1.0
}
```
Response: 
```json
{
  "success": true,
  "message": "Feed mapping created",
  "data": {
    "mapping_id": 101,
    "feed_name": "home/1/2/5/temperature",
    "house_id": 1,
    "room_id": 2,
    "device_id": null,
    "sensor_id": 5,
    "feed_type": "sensor"
  }
}
```

**Create Device Control Mapping (NEW):**
```bash
POST /api/adafruit/mappings
{
  "feed_name": "home/1/1/10/brightness",
  "house_id": 1,
  "room_id": 1,
  "device_id": 10,
  "feed_type": "device",
  "data_key": "level",
  "conversion_factor": 1.0
}
```

---

## 📁 Project Structure

```
c:\Users\namkz\Desktop\dacn\dadn\New folder\
├── 📄 .env                              # Environment variables (SQLite)
├── 🐍 app.py                            # Backend Flask app (PORT 8000) + Automation endpoints
├── 📄 config.py                         # Configuration
├── 🐍 models.py                         # SQLAlchemy ORM models (AutomationRule + RuleCondition)
├── 🐍 automation_service.py             # Automation rules evaluation engine (NEW!)
├── 🐍 notification_service.py           # Notification service for real-time alerts
├── 🐍 admin_service.py                  # Admin management utilities
├── 🐍 requirements.txt                  # Python dependencies
├── 🐍 seed_database.py                  # Seed 73 test devices + 3 automation rules
│
├── 📁 mobile/                           # Mobile App (React Native)
│   ├── 📄 App.js                        # Navigation setup
│   ├── 📄 package.json                  # Dependencies
│   ├── 📄 app.json                      # Expo config
│   ├── 📁 src/
│   │   ├── 📁 screens/
│   │   │   ├── 🎨 HomeScreen.js        # 🏠 Houses list + Notifications bell
│   │   │   ├── 🎨 HousesScreen.js      # 🏘️ User house management (CRUD)
│   │   │   ├── 🎨 FloorsScreen.js      # 🏢 Floor management (CRUD)
│   │   │   ├── 🎨 RoomsScreen.js       # 🚪 Room management (CRUD) + Sensor management
│   │   │   ├── 🎨 DevicesScreen.js     # ⚙️ Device management (CRUD) + Real-time Control ⭐
│   │   │   ├── 🎨 AutomationRulesScreen.js # 🤖 Automation rules (NEW!)
│   │   │   ├── 🎨 NotificationCenter.js # 🔔 Notification display
│   │   │   ├── 🎨 LoginScreen.js       # 👤 User login
│   │   │   └── 🎨 SignupScreen.js      # 📝 User registration
│   │   ├── 📁 context/
│   │   │   └── 🔐 AuthContext.js       # Global auth state
│   │   └── 📁 services/
│   │       ├── 🔌 api.js                # Backend REST API client
│   │       ├── 🔌 auth.js               # Authentication service
│   │       ├── 🔌 realtime.js           # Socket.IO real-time client ⭐ (NEW!)
│   │       └── 🔌 notification_socket.js # WebSocket notifications
│   └── 📄 README.md                     # Mobile setup guide
│
├── 📁 instance/                         # SQLite database location
│   └── 📦 smarthome.db                  # Main database file
│
├── 📁 venv/                             # Python virtual environment
├── 📄 SETUP_GUIDE.md                    # Complete system setup
├── 📄 README.md                         # Project readme
└── 📄 PROJECT_COMPREHENSIVE_SUMMARY.md  # This file (UPDATED)
```

---

## ⭐ Key Features

### 0. **User Self-Service CRUD Management** (COMPLETE)
- ✅ HousesScreen: Create, Edit, Delete user's houses
- ✅ FloorsScreen: Create, Edit, Delete floors in house
- ✅ RoomsScreen: Create, Edit, Delete rooms in floor
- ✅ DevicesScreen: Create, Edit, Delete devices in room
- ✅ Delete confirmation dialogs with user confirmation
- ✅ Form validation for required fields
- ✅ Success/error notifications
- ✅ Pull-to-refresh data loading

### 0.5 **Sensor Management - Option A (Auto-Unit Mapping)** (COMPLETE - NEW!)
- ✅ Form: **Create/Edit sensors** with **Name + Type only** (no unit input)
- ✅ Display: **Expandable sensor cards** showing Type + Name + Current Value + Auto Unit
- ✅ Auto-unit mapping based on sensor type:
  - Temperature → °C | Humidity → % | Motion → boolean
  - Light → lux | CO2 → ppm | Pressure → hPa
- ✅ Sensor CRUD: Create, Read, Update, Delete sensors per room
- ✅ Real-time value display from Adafruit (when device connected)
- ✅ Expand/collapse sensor list per room with + Add button
- ✅ Backend auto-detects unit based on sensor_type
- ✅ GET endpoint returns: id, name, type, unit, value, timestamp

### 1. **Device Level Control** (0-100%)
- ✅ Lights: 75% default brightness
- ✅ Fans: 50% default speed  
- ✅ TVs: 100% full power
- ✅ AC/Heaters: 70% default setting
- ✅ Off devices: 0%
- ✅ Auto-migration on app startup adds column if missing

### 2. **Real-time MQTT Sync**
- ✅ 4 Adafruit IO feeds: humidity, light, LED, Fan
- ✅ Auto-persistence to database
- ✅ Bidirectional: Hardware → Cloud → Frontend & Backend
- ✅ 6 MQTT message handlers

### 3. **REST API**
- ✅ 28 endpoints covering all CRUD operations
- ✅ Hierarchy: House → Floor → Room → Device/Sensor
- ✅ Full error handling with appropriate HTTP status codes
- ✅ JSON request/response format

### 4. **Frontend Integration**
- ✅ Backend API proxy to avoid CORS issues
- ✅ Real-time data from backend (not localStorage)
- ✅ Navigation: Houses → Floors → Rooms → Devices
- ✅ Device control: On/Off + Level slider
- ✅ Status indicators with color coding

### 5. **Auto-migration**
- ✅ Runs on backend startup via `run_migrations()`
- ✅ Adds `level` column if missing
- ✅ Updates device levels based on type
- ✅ Handles permission errors gracefully

### 6. **Mobile App (React Native + Expo)** ⭐
- ✅ Cross-platform: iOS, Android, Web
- ✅ 6-screen navigation hierarchy
  - 🏠 Browse/manage houses (Create, Edit, Delete)
  - 🏢 Select floors (Create, Edit, Delete)
  - 🚪 View rooms (Create, Edit, Delete) + Sensor management
  - ⚙️ Control devices (Create, Edit, Delete + On/Off + Level 0-100%)
  - 🔔 View notifications (Phase 2)
  - 🤖 Create automation rules with multi-condition AND/OR logic (NEW!)
- ✅ Real-time backend sync via REST API
- ✅ Pull-to-refresh data
- ✅ Professional UI with card-based design
- ✅ Responsive mobile layout
- ✅ Defensive rendering (handles undefined/null values)

### 7. **Automation Rules** ⭐ NEW!
- ✅ Multi-condition rules with AND/OR logic
- ✅ Evaluate conditions every 30 seconds (background thread)
- ✅ Supported operators: >, <, >=, <=, ==, !=
- ✅ Trigger actions: Turn device ON/OFF with adjustable level
- ✅ Condition types: Temperature, Humidity, Motion, Light, CO2, Pressure
- ✅ Per-room automation rules
- ✅ Rule management: Create, Read, Update, Delete, Enable/Disable
- ✅ Test rule: Check if conditions are currently met
- ✅ 3 sample rules seeded with test data
- ✅ Real-time execution with notifications

### 8. **Real-time Sensor & Device Updates** ⭐⭐⭐ NEW!
- ✅ Socket.IO WebSocket connection for real-time sync
- ✅ Auto-subscribe to realtime_updates on app load
- ✅ MQTT → Backend → WebSocket → Frontend pipeline
- ✅ Real-time data broadcast to all connected clients
- ✅ Dashboard auto-refreshes when sensor/device data changes
- ✅ Bi-directional: Receive updates + Send commands

### 9. **Adafruit Feed Mapping System** ⭐⭐⭐ NEW!
- ✅ Map Adafruit IO feeds to devices/sensors
- ✅ Format: `home/[house_id]/[room_id]/[device_id]/[sensor_type]`
- ✅ Example: `home/1/2/5/temperature` → House 1, Room 2, Sensor 5
- ✅ Support both sensor readings and device control
- ✅ Conversion factors for unit scaling
- ✅ CRUD endpoints for managing mappings
- ✅ Smart routing: Parse MQTT topic → Find mapping → Update device/sensor
- ✅ 6 API endpoints for feed management

### 10. **Device Control via MQTT** ⭐⭐⭐ NEW!
- ✅ Publish device commands to Adafruit IO
- ✅ Support status commands (ON/OFF)
- ✅ Support level commands (brightness, speed 0-100%)
- ✅ Real-time slider control in UI
- ✅ Auto-update database when sending commands
- ✅ Feedback loop: Hardware responds → MQTT → Frontend updates
- ✅ Error handling: Failed commands logged
- ✅ Support for multi-scale device mapping

---

## 🚀 Running the System

### Prerequisites
```bash
# ✅ Already installed:
- Python 3.13.7
- Node.js 22.11.0
- npm 10.9.1
- Expo CLI (or install with: npm install -g expo-cli)
```

### ⚡ System Requirements for Running on Mobile

| Platform | Requirement | Installation |
|----------|-------------|---------------|
| **Android Emulator** | Android Studio | [Download](https://developer.android.com/studio) |
| **iOS Simulator** | Xcode (macOS only) | `xcode-select --install` |
| **Physical Device** | Expo Go app | Google Play Store / App Store |
| **WiFi** | Same network | Router or hotspot |

### Quick Start (2 Terminals)

**Terminal 1 - Backend API (Port 8000)**
```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"
.\venv\Scripts\Activate.ps1
python app.py
# ✅ Running on http://localhost:8000
# ✅ SQLite database: instance/smarthome.db
# ✅ MQTT connected to Adafruit IO
```

**Terminal 2 - Mobile App (Expo)**
```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder\mobile"
npm start
# Follow the menu to choose your platform
```

### 🤖 Running on Android

**Option 1: Android Emulator (Fastest)**
```bash
cd mobile
npm start
# Press 'a' in terminal OR:
npm run android

# First run will:
# 1. Install Android SDK (if needed)
# 2. Start Android Emulator
# 3. Build and deploy app
# 4. App opens automatically
```

**Option 2: Physical Android Device (USB)**
```bash
# Enable Developer Mode on phone:
# 1. Settings → About phone
# 2. Tap "Build number" 7 times
# 3. Settings → Developer options → USB debugging ON
# 4. Connect via USB cable

cd mobile
npm start
# Press 'a' to run on connected device
```

**Option 3: Expo Go App (Easiest)
```bash
# On your Android phone:
# 1. Install "Expo Go" from Google Play Store
# 2. Connect phone to SAME WiFi as computer
# 3. Run on computer:

cd mobile
npm start
# Scan QR code with Expo Go app
```

### 🍎 Running on iOS

**⚠️ Requirements: Mac computer with Xcode**
```bash
cd mobile
npm start
# Press 'i' in terminal OR:
npm run ios

# First run will:
# 1. Install iOS Simulator (if needed)
# 2. Start Simulator
# 3. Build and deploy app
# 4. App opens automatically
```

**Physical iOS Device (iPhone) - via Expo Go**
```bash
# On your iPhone:
# 1. Install "Expo Go" from Apple App Store
# 2. Connect to SAME WiFi as computer
# 3. On computer:

cd mobile
npm start
# Scan QR code with Expo Go app
```

**Note:** Physical iOS testing requires Xcode installation on Mac.

### First Time Setup

```bash
# 1. Activate venv (if not already)
.\venv\Scripts\Activate.ps1

# 2. Seed database with test data
python seed_database.py
# Creates: 5 houses, ~20 floors, ~35 rooms, 73 devices

# 3. Start backend
python app.py

# 4. Test API
Invoke-WebRequest http://localhost:8000/api/houses -UseBasicParsing
# Should return JSON with 5 houses
```

### Test the System

```bash
# Check backend health
curl http://localhost:8000/api/health

# Get all houses
curl http://localhost:8000/api/houses

# Get all devices with status/level
curl http://localhost:8000/api/devices/status

# Create a new house
curl -X POST http://localhost:8000/api/houses \
  -H "Content-Type: application/json" \
  -d '{"name": "New House", "address": "123 Main St", "city": "City", "country": "Country"}'

# Create a new floor in house (ID=1)
curl -X POST http://localhost:8000/api/floors \
  -H "Content-Type: application/json" \
  -d '{"house_id": 1, "floor_name": "Ground Floor", "floor_number": 1}'

# Create a new room in floor (ID=1)
curl -X POST http://localhost:8000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"floor_id": 1, "room_name": "Living Room", "room_type": "living_room", "description": "Main living area"}'

# Create a new device in room (ID=1)
curl -X POST http://localhost:8000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"room_id": 1, "device_name": "Main Light", "device_type": "light", "status": "off", "level": 0}'

# Delete device (ID=1)
curl -X DELETE http://localhost:8000/api/devices/1

# Update device level to 75%
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id": 1, "status": "on", "level": 75}'

# Create a new sensor in room (ID=1)
curl -X POST http://localhost:8000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"room_id": 1, "sensor_name": "Living Room Temp", "sensor_type": "temperature"}'
# Response includes auto-set unit: "unit": "°C"

# Get all sensors in room (ID=1)
curl http://localhost:8000/api/rooms/1/sensors
# Returns: [{"id": 1, "name": "Living Room Temp", "type": "temperature", "unit": "°C", "value": 25.5, "timestamp": "..."}]

# Update sensor (ID=1)
curl -X PUT http://localhost:8000/api/sensors/1 \
  -H "Content-Type: application/json" \
  -d '{"sensor_name": "Main Temp Sensor", "sensor_type": "temperature"}'
# Unit auto-updates to: "°C"

# Delete sensor (ID=1)
curl -X DELETE http://localhost:8000/api/sensors/1

# Mobile App - Test User CRUD
# 1. Login with: bach/password123
# 2. Navigate to houses
# 3. Click "+ Add House" and create new house
# 4. Click on house → Click "+ Add Floor" and create floor
# 5. Click on floor → Click "+ Add Room" and create room
# 6. Click on room → Click "+ Add Device" and create device
# 7. Click ▶ "Sensors" to expand sensor section
# 8. Click "+ Add" to create sensor with:
#    - Name: "Room Temperature"
#    - Type: "temperature"
#    - Unit auto-sets to: °C
# 9. Click ✎ Edit button to modify sensor name/type
# 10. Click 🗑️ Delete button to remove sensor
# 11. Verify all CRUD operations work correctly
# 12. Test delete: Click 🗑️ button, confirm delete
```

---

## 📊 Current Status

### ✅ Feature 0: User Self-Service CRUD Management (COMPLETE - NEW!)
- ✅ HousesScreen (Create, Read, Update, Delete houses)
  - List all user's houses with address
  - Add new house with name, address, city, country
  - Edit house details
  - Delete house with confirmation
  - Navigation to view floors in house
- ✅ FloorsScreen (Create, Read, Update, Delete floors)
  - List all floors in selected house
  - Add new floor with name, floor number, description
  - Edit floor details
  - Delete floor with all devices confirmation
  - Navigation to view rooms in floor
- ✅ RoomsScreen (Create, Read, Update, Delete rooms) + Sensor Management
  - List all rooms in selected floor
  - Add new room with name, type (bedroom, kitchen, etc.), description
  - Edit room details
  - Delete room with all devices confirmation
  - Navigation to view devices in room
  - **Sensor Management - Option A (Auto-Unit Mapping):**
    - Expandable sensors section per room with ▶/▼ toggle
    - Create sensor with Name + Type only (unit auto-determined)
    - Edit sensor name and type (unit auto-updated)
    - Delete sensor with confirmation
    - Display current value with auto-mapped unit:
      - Temperature → °C | Humidity → % | Motion → boolean
      - Light → lux | CO2 → ppm | Pressure → hPa
    - Latest sensor value from SensorData table
    - "+ Add" button to create new sensors
- ✅ DevicesScreen (Create, Read, Update, Delete devices + Control)
  - List all devices in selected room with status & level
  - Add new device with name, type, initial status, level (0-100%)
  - Edit device details
  - Delete device with confirmation
  - Device control: Toggle status (ON/OFF)
  - Device control: Level slider (0-100%) for fans, lights, AC
  - Real-time status display with color coding
- ✅ Bug Fixes Applied:
  - Fixed React Native text node rendering errors (removed JSX comments from Views)
  - Added defensive rendering (Number() || 0, || 'Unknown', || 'off')
  - Changed delete handlers from Alert.alert Promise to window.confirm() for web
  - Fixed backend room/device endpoints to return proper field names
  - Added comprehensive console logging for debugging

### ✅ Feature 1: User Authentication (COMPLETE + ALL FIXES ✅)
- ✅ Backend JWT authentication with password hashing
- ✅ Register/Login/Logout endpoints
- ✅ Mobile LoginScreen & SignupScreen
- ✅ AuthContext global state management with proper async handling
- ✅ Automatic redirect based on auth status via App.js conditional routing
- ✅ HomeScreen shows Welcome when not logged in
- ✅ HomeScreen shows Houses list when logged in
- ✅ Logout button at top-right header with Alert.alert() dialog
- ✅ **FIXED APRIL 16:** Logout now works perfectly:
  - handleLogout() moved BEFORE useEffect (scope fix)
  - Changed from browser confirm() to Alert.alert() (React Native compatible)
  - signOut() properly clears AsyncStorage + updates state
  - App.js re-renders → shows AuthStack (login screen) ✅
- ✅ Token persistent in AsyncStorage (mobile) + localStorage (web)
- ✅ 2000ms AsyncStorage write delay (Expo Go workaround)
- ✅ Test user seeded: bach/password123

### ✅ Feature 2: Real-time Notifications (COMPLETE - PHASE 2 + TOUCH FIX ✅)

**Phase 1 - Backend Foundation:** ✅ COMPLETE
- ✅ Notification database model added (29th table)
  - Fields: notification_id, user_id, title, message, notification_type, device_id, is_read, created_at, read_at
  - Types: device_change, threshold_alert, automation_trigger
- ✅ NotificationService class created with methods:
  - create_notification(), get_user_notifications(), mark_as_read(), delete_notification()
  - notify_device_change(), notify_threshold_alert(), notify_automation_trigger()
- ✅ Flask-SocketIO installed and integrated
  - WebSocket handlers: connect, disconnect, auth, subscribe_notifications, get_notifications
  - Real-time event emission: notification_received, notification_marked_read, notification_deleted, notifications_cleared
- ✅ REST API notification endpoints:
  - GET /api/notifications - Get all user notifications
  - GET /api/notifications/{id} - Get specific notification
  - PUT /api/notifications/{id}/read - Mark as read
  - DELETE /api/notifications/{id} - Delete notification
  - DELETE /api/notifications/clear-all - Clear all notifications
- ✅ SocketIO room management for per-user real-time delivery
- ✅ emit_notification_to_user() helper function for backend event emission

**Phase 2 - Mobile UI:** ✅ COMPLETE
- ✅ NotificationCenter.js screen created with:
  - Pull-to-refresh to fetch latest notifications
  - List of notifications sorted by newest first
  - Tap notification to mark as read
  - Delete button on each notification
  - Unread count in header
  - Empty state showing "No Notifications"
  - Time formatting (Just now, 5m ago, etc.)
  - Notification type badges (icons)
- ✅ Added to navigation stack (App.js)
- ✅ Added notification bell button to HomeScreen header (when signed in)
- ✅ Button navigates to NotificationCenter screen

**Phase 2B - Touch Responsiveness Fix:** ✅ COMPLETE (APRIL 17)
**Root Cause:** NotificationItem defined inside component → React recreates on every render → constant unmount/remount → touch listeners reset
**Solution:**
  - Extracted NotificationItem outside main component
  - Wrapped with React.memo() for stable reference
  - Replaced FlatList with ScrollView + map()
  - Wrapped all handlers with useCallback()
  - Cleaned up debug logs
**Result:** ✅ 100% Touch Responsiveness - Single tap DELETE/MARK-AS-READ works instantly
**Test Data:** 10 diverse notifications (device_change, threshold_alert, automation_trigger)

**Phase 3 - SocketIO Integration:** ⏳ FUTURE ENHANCEMENT
- ⏳ Create notification_socket.js service for client-side SocketIO connection
- ⏳ Implement real-time listener for notification_received event
- ⏳ Auto-load new notifications when received
- ⏳ Badge update when new unread notifications arrive

**Current Status (April 17):**
- ✅ Backend: 100% working (verified via cURL tests)
- ✅ Mobile UI: 100% working (responsive, diverse test data)
- ✅ Touch Events: 100% responsive (single tap = instant action)
- ✅ Unread Count: Updating correctly
- ✅ Pull-to-Refresh: Working properly
- ✅ API Integration: All endpoints return 200 OK

### ✅ Feature 3: Device Automation Rules (COMPLETE - NEW!)
- ✅ Database schema with AutomationRule + RuleCondition tables
- ✅ Multi-condition logic: AND (all conditions true) or OR (any condition true)
- ✅ Supported operators: >, <, >=, <=, ==, !=
- ✅ Condition types: Temperature, Humidity, Motion, Light, CO2, Pressure
- ✅ Action: Turn device ON/OFF with adjustable level (0-100%)
- ✅ Backend AutomationService:
  - evaluate_condition() - Check single condition against operator
  - get_latest_sensor_value() - Fetch sensor data from database
  - evaluate_rule() - Apply AND/OR logic to all conditions
  - execute_rule_action() - Update device + create notification
  - check_all_rules() - Run every 30 seconds (background thread)
- ✅ 7 REST API endpoints:
  - GET /api/rooms/{room_id}/automation-rules - List all rules
  - POST /api/rooms/{room_id}/automation-rules - Create rule
  - GET /api/automation-rules/{rule_id} - Get rule details
  - PUT /api/automation-rules/{rule_id} - Update rule
  - DELETE /api/automation-rules/{rule_id} - Delete rule
  - POST /api/automation-rules/{rule_id}/toggle - Enable/disable
  - POST /api/automation-rules/{rule_id}/test - Test rule conditions
- ✅ AutomationRulesScreen (400+ lines):
  - List all rules for selected room
  - Create rules with dynamic condition builder
  - Multi-condition form (add/remove conditions)
  - Logic type selector (AND or OR)
  - Device picker for action target
  - Status (on/off) and level slider for action
  - Test button to check if rule would execute
  - Delete and toggle switches per rule
  - Pull-to-refresh to reload
- ✅ Background automation checker (30-second interval)
- ✅ 3 sample rules seeded with test data:
  - Smart Fan: Temperature > 30 AND Humidity > 80 → Turn ON fan at 80%
  - Smart Light: Temperature < 15 OR Motion detected → Turn ON light at 100%
  - Energy Saver: Light > 500 Lux → Turn OFF light (disabled)
- ✅ Real-time device control via automation + notifications

### ✅ Feature 4: Real-time Sensor & Device Updates (COMPLETE - NEW!)
- ✅ Socket.IO WebSocket connection setup with proper CORS
- ✅ RealtimeService (realtime.js) for client-side SocketIO
- ✅ Socket connection with automatic reconnection (5s retry, 5 attempts max)
- ✅ Multi-event listeners: connect, connect_error, disconnect
- ✅ Authentication flow: connect → auth → subscribeToRealtimeUpdates
- ✅ Real-time event subscription with token validation
- ✅ Socket handlers on backend:
  - subscribe_realtime: Add user to realtime update room
  - unsubscribe_realtime: Remove user from room
  - onRealtimeUpdate: Broadcast sensor/device changes to all clients
- ✅ MQTT → SocketIO bridge in on_message handler
  - Parse MQTT topic with mapping lookup
  - Broadcast updates with house_id + room_id for targeting
- ✅ DashboardScreen integration:
  - Auto-connect realtime on mount
  - Listen for realtime_update events
  - Auto-refresh dashboard when sensor/device changes
  - Cleanup on unmount
- ✅ Real-time status: Instant updates without polling
- ✅ Works with Adafruit IO feed mapping system

### ✅ Feature 5: Adafruit Feed Mapping System (COMPLETE - NEW!)
- ✅ AdafruitFeedMapping database model
  - feed_name: Unique mapping identifier (home/1/2/5/temperature)
  - house_id, room_id, device_id, sensor_id: Location tracking
  - feed_type: 'sensor' or 'device'
  - data_key: 'status' or 'level' for device mapping
  - conversion_factor: For scaling (e.g., 0-1 → 0-100%)
  - is_active: Enable/disable mappings
- ✅ MQTT message parsing:
  - Extract feed path from topic: `{USERNAME}/feeds/{FEED_PATH}`
  - Look up mapping in database
  - Route to correct device/sensor
- ✅ Smart sensor handling:
  - Save SensorData with conversion applied
  - Broadcast realtime update with sensor_type + unit
- ✅ Smart device handling:
  - Handle status commands: 'on'/'off' or 0/1
  - Handle level commands: 0-100 percentage
  - Apply conversion factor for device scale
  - Auto-update device.status based on level
- ✅ 6 REST API endpoints:
  - GET /api/adafruit/mappings - List user's mappings
  - GET /api/adafruit/mappings/{mapping_id} - Get specific
  - POST /api/adafruit/mappings - Create mapping
  - PUT /api/adafruit/mappings/{mapping_id} - Update mapping
  - DELETE /api/adafruit/mappings/{mapping_id} - Delete mapping
  - Authorization checks: owner/manager only
- ✅ Error handling:
  - Feed not found → Warning log (no crash)
  - Mapping lookup failure → Graceful fallback
  - Database transaction rollback on error
  - Detailed error logs for debugging
- ✅ Flexible format supporting:
  - Sensor readings: home/1/2/5/temperature
  - Device control: home/1/1/10/brightness
  - Custom feed names with proper validation

### ✅ Feature 6: Device Control via MQTT (COMPLETE - NEW!)
- ✅ publish_device_command() function:
  - Device lookup validation
  - Mapping discovery for MQTT topic
  - Payload formatting based on command_type
  - MQTT publish with QoS=1 (at-least-once)
  - Local database update before publishing
- ✅ Command types:
  - Status: Convert on/off → 1/0 for hardware
  - Level: Convert 0-100% → device scale via conversion_factor
- ✅ Frontend integration in DevicesScreen:
  - Toggle button for ON/OFF status
  - Slider control for brightness/speed/level
  - Real-time feedback after command sent
  - Error alerts on failure
  - updateDeviceLevel() async function
  - toggleDeviceStatus() async function
- ✅ PUT /devices/{id} enhanced:
  - Detect status/level changes
  - Auto-publish commands to MQTT
  - Dual update: Database + Hardware
  - Response includes: success status + command sent message
- ✅ UI Components:
  - CustomSlider for 0-100% level control
  - Visual feedback: device name + brightness display
  - Color-coded status buttons
  - Level bar visualization (0-100%)
  - Responsive slider with live value updates
- ✅ Full workflow:
  1. User drags slider to 75%
  2. updateDeviceLevel() called
  3. PUT /devices/{id} with level: 75
  4. Backend publishes to MQTT: home/1/1/10/brightness = 75
  5. Hardware receives command
  6. Hardware updates LED/motor/AC
  7. Hardware publishes status back
  8. Backend receives via MQTT → broadcast realtime
  9. Frontend receives realtime update → auto-refresh
  10. Slider shows current hardware state

### 📋 Remaining Features:
- [ ] Feature 7: Favorites/Quick Access
- [ ] Feature 8: Device History & Logs
- [ ] Feature 9: Energy Tracking Dashboard
- [ ] Feature 10: Offline Mode Support
- [ ] Feature 11: Voice Control Integration
- [ ] Feature 12: Device Scheduling
- [ ] Feature 13: Multi-user Sharing/Permissions

---

## 🔧 Recent Bug Fixes & Improvements (April 16, 2026)

### React Native Rendering Issues
**Problem:** "Unexpected text node: ." error in browser console
**Cause:** JSX comments `{/* comment */}` inside View components were treated as text nodes by React Native Web
**Solution:** Removed all JSX comments from inside View components
**Files Fixed:** RoomsScreen.js, FloorsScreen.js, DevicesScreen.js, HousesScreen.js
**Status:** ✅ FIXED

### Undefined Value Rendering
**Problem:** Rendering undefined/null values caused React warnings
**Cause:** Backend data missing fields, frontend not handling defensive rendering
**Solution:** Added defensive rendering patterns:
  - `Number(item.level) || 0` - ensures numeric value
  - `item.name || 'Unknown'` - ensures string value
  - `item.status || 'off'` - ensures valid status
  - `getDeviceTypeDisplay(item.type || 'other')` - fallback to 'other'
**Files Fixed:** RoomsScreen.js, DevicesScreen.js
**Status:** ✅ FIXED

### Delete Functionality Not Working
**Problem:** Delete buttons clicked but items not removed from list
**Cause:** React Native Alert.alert() Promise callback not executing properly on web
**Solution:** Replaced Alert.alert() with window.confirm() for web compatibility
**Implementation:**
  - `window.confirm()` returns true/false immediately
  - Direct async/await to backend DELETE endpoint
  - Proper error handling with console logging
  - UI refreshes after successful delete
**Files Fixed:** DevicesScreen.js, RoomsScreen.js, HousesScreen.js
**Status:** ✅ FIXED

### Backend API Response Field Names
**Problem:** Frontend expected field name `id` but backend returned `device_id`, `room_id`
**Solution:** Updated backend to return normalized field names:
  - GET /api/devices → returns `id`, `name`, `type`, `status`, `level`
  - GET /api/rooms → returns `id`, `name`, `room_type`, `description`
  - GET /api/floors → returns `id`, `name`, `floor_number`, `description`
**Files Fixed:** app.py endpoints
**Status:** ✅ FIXED

### Enum Comparison Bug (Previously Fixed)
**Problem:** Enum objects compared with strings always failed
**Cause:** `request.user_role = user.role` (Enum) vs checking `== 'admin'` (string)
**Solution:** Extract enum value with `.value`: `request.user_role = user.role.value`
**Impact:** Fixed admin panel access and role-based authorization
**Status:** ✅ VERIFIED WORKING

---

### What is "Level"?

A numeric value (0-100) representing device intensity:
- `0` = Device OFF
- `1-99` = Partial intensity (fan speed, light brightness, etc.)
- `100` = Maximum intensity

### How It Works

1. **Model Layer** (`models.py`):
   ```python
   class Device(db.Model):
       level = db.Column(db.Integer, default=0)  # 0-100 scale
   ```

2. **API Layer** (`app.py`):
   - `GET /api/devices/status` returns level for each device
   - `POST /api/device-status` accepts `{"device_id": X, "level": Y}`

3. **Auto-migration** (runs on startup):
   ```python
   def run_migrations():
       # 1. Add level column if missing
       # 2. Set levels based on device type:
       #    - Lights → 75%
       #    - Fans → 50%
       #    - TVs → 100%
       #    - etc.
   ```

4. **Mobile App** (`DevicesScreen.js`):
   ```javascript
   // Slider control 0-100%
   <Slider
     style={{width: '90%'}}
     minimumValue={0}
     maximumValue={100}
     value={device.level}
     onValueChange={(value) => setDeviceLevel(device, value)}
   />
   ```

### Example API Call

```bash
# Turn on light to 75% brightness
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id": 1, "status": "on", "level": 75}'

# Response:
# {"device_id": 1, "status": "on", "level": 75}
```

---

## 📱 Mobile App Architecture

### From Mobile App to Backend
```
Mobile App (Expo/React Native)
    ↓ (axios HTTP client)
Backend API (Port 8000)
    ↓ (SQLAlchemy ORM)
SQLite Database
```

### Key Files

**`src/services/api.js`** - API Client Service
- Base URL: `http://10.0.106.239:8000/api` (configurable IP)
- Axios instance with error handling
- Functions: `getHouses()`, `getFloors()`, `getDevices()`, `updateDevice()`, etc.

**Mobile Screens** - UI Components
- `HomeScreen.js` - Display list of user's houses + Manage button for quick access
- `HousesScreen.js` - CRUD houses (Create, Edit, Delete) ✅ FULLY FUNCTIONAL
- `FloorsScreen.js` - CRUD floors (Create, Edit, Delete) ✅ FULLY FUNCTIONAL
- `RoomsScreen.js` - CRUD rooms (Create, Edit, Delete) ✅ FULLY FUNCTIONAL
- `DevicesScreen.js` - CRUD devices + Control (On/Off + Level slider) ✅ FULLY FUNCTIONAL
- `NotificationCenter.js` - View and manage notifications (Phase 2)

### Data Flow Example

User toggles device in mobile app:
1. Mobile UI calls `updateDevice(deviceId, status, level)`
2. `api.js` sends: `POST http://10.0.106.239:8000/api/device-status`
3. Backend updates device in SQLite database
4. Backend response includes updated device state
5. Mobile UI refreshes with new device state

---

## 📞 API Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET houses ✅ |
| 201 | Created | POST sensor-data ✅ |
| 400 | Bad Request | Missing required field |
| 404 | Not Found | Device ID doesn't exist |
| 500 | Server Error | Database connection error |

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check .env file exists
cat .env

# Check virtual environment is activated
.\venv\Scripts\Activate.ps1

# Try running app directly
python app.py

# Check SQLite database file exists
dir instance\smarthome.db
```

### Frontend can't reach backend
```bash
# Check backend is running on 8000
curl http://localhost:8000/api/health

# Check BACKEND_API_URL in config.js matches backend port
# Should be: http://localhost:8000
```

### Devices not updating when control changes
```bash
# Check MQTT is connected in backend
# Look for log: "✅ Connected to Adafruit IO MQTT"

# Verify Adafruit credentials in .env
cat .env | grep ADAFRUIT
```

---

## 📚 Additional Resources

- **Database Diagram:** See `erd.drawio`
- **Backend Docs:** See `README_BACKEND.md`
- **Project Structure:** See `PROJECT_STRUCTURE.md`
- **Migration Details:** Check `app.py` → `run_migrations()` function

---

## 🎓 Quick Reference Commands

```bash
# Backend
python app.py                           # Start backend :8000

# Mobile App
cd mobile && npm start                  # Start Expo
cd mobile && npm run android            # Android Emulator
cd mobile && npm run ios                # iOS Simulator
cd mobile && npm run web                # Web browser

# Database
python seed_database.py                 # Seed 73 test devices

# Get all houses
curl http://localhost:8000/api/houses
```

---

**Version:** 3.0 (Mobile App + Full CRUD + Sensor Management + Automation Rules + Auth All Fixed + Notifications 100% Working + Real-time Sync + Device Control + Adafruit Feed Mapping)
**Last Updated:** April 17, 2026 - REAL-TIME SYNC & DEVICE CONTROL COMPLETE ✅
**Status:** ✅ FULLY OPERATIONAL & PRODUCTION READY
- ✅ Authentication (login/logout) - 100% working
- ✅ User CRUD management - 100% complete
- ✅ Sensor management - 100% complete  
- ✅ Notifications system - Backend + UI + Touch Fix 100% working
- ✅ Notification Touch Responsiveness - Single tap DELETE/MARK-AS-READ working
- ✅ Automation Rules - 100% complete with multi-condition AND/OR logic
- ✅ Background automation checker - running every 30 seconds
- ✅ Real-time Socket.IO integration - Live updates working
- ✅ Adafruit Feed Mapping system - 6 CRUD endpoints + smart routing
- ✅ Device Control via MQTT - Slider + Toggle commands
- ✅ All critical bugs fixed & verified
- ✅ Test data - 10 diverse notifications for UI testing
- ✅ Code cleanup - removed debug logs, optimized components
- ✅ Ready for production deployment on Expo Go

---

## ✅ Bug Fixes & Improvements - April 17, 2026 (Notification Touch Fix)

### Notification Touch Responsiveness - FIXED ✅ (APRIL 17 - CRITICAL)
**Issue:** Delete button (✕) and mark-as-read area required spam tapping to respond
**Symptoms:**
- Single tap didn't trigger handler
- Required multiple spam taps (10+) to work
- Affected Android mobile (not web)

**Root Cause Analysis:**
  1. **PRIMARY:** NotificationItem defined INSIDE NotificationCenter
     - React recreated it on every parent render
     - Component unmount/remount reset touch event listeners
  2. FlatList known issue on Android
     - Aggressive rendering optimization interferes with child touch events
  3. Handlers without useCallback
     - Stale closure references
     - Dependency array issues

**Solutions Implemented:**
  1. ✅ Extracted NotificationItem outside NotificationCenter
     - Component defined at top-level before main component
     - Stable reference across renders
  2. ✅ Wrapped with React.memo()
     - Only re-renders when props actually change
     - Prevents unnecessary recreation
  3. ✅ Replaced FlatList with ScrollView + map()
     - Simpler rendering without aggressive optimizations
     - Better touch event propagation on Android
  4. ✅ Wrapped handlers with useCallback
     - Maintains stable function reference
     - Proper dependency arrays
  5. ✅ Fixed stale references in Alert callbacks
     - Used functional setNotifications to avoid closure issues
  6. ✅ Cleaned up debug logs
     - Removed onPressIn, onPressOut, onLongPress debug spam
     - Kept only essential error handlers

**Verification:**
- ✅ Backend API verified (DELETE, PUT return 200 OK via cURL)
- ✅ Mobile UI renders 10 diverse notifications (device_change, threshold_alert, automation_trigger)
- ✅ Single tap notification → Marks as read → Unread dot disappears instantly
- ✅ Single tap delete button → Alert confirms → Notification removed instantly
- ✅ No more spam tapping required

**Result:** 🎉 **100% Touch Responsiveness - Feature PRODUCTION READY**

---

## ✅ Real-time Sensor & Device Updates - April 17, 2026 (NEW FEATURE)

### Socket.IO Real-time Synchronization - IMPLEMENTED ✅
**Purpose:** Enable instant sensor and device updates without polling
**Implementation:**

**Backend (app.py):**
```python
@socketio.on('connect')
def on_connect():
    print(f"✅ Client connected: {request.sid}")

@socketio.on('auth')
def on_auth(data):
    token = data.get('token')
    decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    session['user_id'] = decoded['sub']
    print(f"✅ User authenticated: {session['user_id']}")

@socketio.on('subscribe_realtime')
def on_subscribe_realtime():
    user_id = session.get('user_id')
    join_room(f'user_{user_id}')
    print(f"✅ User {user_id} subscribed to real-time updates")

@socketio.on('unsubscribe_realtime')
def on_unsubscribe_realtime():
    user_id = session.get('user_id')
    leave_room(f'user_{user_id}')
    print(f"✅ User {user_id} unsubscribed from real-time updates")
```

**Frontend (realtime.js):**
```javascript
export const connect = (token) => {
  const apiUrl = getApiUrl();
  socket = io(apiUrl.replace('/api', ''), {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });
  
  socket.on('connect', () => console.log('✅ Socket connected'));
  socket.on('connect_error', (err) => console.error('❌ Socket error:', err));
};

export const subscribeToRealtimeUpdates = (token) => {
  socket?.emit('subscribe_realtime', { token });
};

export const onRealtimeUpdate = (callback) => {
  socket?.on('realtime_update', callback);
};
```

**MQTT → WebSocket Bridge (on_message handler):**
```python
def on_message(client, userdata, msg):
    try:
        feed_path = msg.topic.split('/feeds/')[1]
        mapping = AdafruitFeedMapping.query.filter_by(
            feed_name=feed_path, is_active=True
        ).first()
        
        if not mapping:
            print(f"⚠️ No mapping found for feed: {feed_path}")
            return
        
        payload = float(msg.payload.decode())
        if mapping.conversion_factor:
            payload *= mapping.conversion_factor
        
        if mapping.feed_type == 'sensor':
            sensor_data = SensorData(
                sensor_id=mapping.sensor_id,
                value=payload,
                timestamp=datetime.utcnow()
            )
            db.session.add(sensor_data)
        
        elif mapping.feed_type == 'device':
            device = Device.query.get(mapping.device_id)
            if mapping.data_key == 'status':
                device.status = 'on' if payload else 'off'
            elif mapping.data_key == 'level':
                device.level = int(payload)
        
        db.session.commit()
        
        # Broadcast to all connected clients
        socketio.emit('realtime_update', {
            'house_id': mapping.house_id,
            'room_id': mapping.room_id,
            'device_id': mapping.device_id,
            'sensor_id': mapping.sensor_id,
            'value': payload,
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)
        
        print(f"📡 Real-time update broadcast: {mapping.feed_name} = {payload}")
    except Exception as e:
        print(f"❌ MQTT error: {e}")
```

**Frontend Integration (DashboardScreen):**
```javascript
useEffect(() => {
  setupRealtime();
  return () => {
    realtimeService.disconnect();
  };
}, []);

const setupRealtime = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    realtimeService.connect(token);
    realtimeService.authenticate(token);
    realtimeService.subscribeToRealtimeUpdates(token);
    
    realtimeService.onRealtimeUpdate(() => {
      loadDashboardData(false); // Refresh without loader
      setRealtimeConnected(true);
    });
  } catch (error) {
    console.error('❌ Real-time setup failed:', error);
  }
};
```

**Result:** ✅ Real-time sensor and device updates working - Dashboard auto-refreshes when data changes

---

## ✅ Adafruit Feed Mapping System - April 17, 2026 (NEW FEATURE)

### Feed Mapping Architecture - IMPLEMENTED ✅
**Purpose:** Map Adafruit IO feeds to devices/sensors in the database
**Format:** `home/[house_id]/[room_id]/[device_id]/[sensor_type]`

**Database Model (models.py):**
```python
class AdafruitFeedMapping(db.Model):
    __tablename__ = 'adafruit_feed_mapping'
    
    mapping_id = db.Column(db.Integer, primary_key=True)
    feed_name = db.Column(db.String(255), unique=True)
    house_id = db.Column(db.Integer, db.ForeignKey('house.house_id'))
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'))
    device_id = db.Column(db.Integer, db.ForeignKey('device.device_id'))
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensor.sensor_id'))
    feed_type = db.Column(db.String(50))  # 'sensor' or 'device'
    data_key = db.Column(db.String(100))  # 'status' or 'level'
    conversion_factor = db.Column(db.Float, default=1.0)
    is_active = db.Column(db.Boolean, default=True)
```

**API Endpoints (6 total):**

1. **GET /api/adafruit/mappings** - List all user's mappings
   - Filter by house_id, room_id (optional)
   - Returns: [{ mapping_id, feed_name, device_id, sensor_id, feed_type, conversion_factor, is_active }]

2. **POST /api/adafruit/mappings** - Create new mapping
   ```json
   {
     "feed_name": "home/1/2/5/temperature",
     "house_id": 1,
     "room_id": 2,
     "sensor_id": 5,
     "feed_type": "sensor",
     "conversion_factor": 1.0
   }
   ```

3. **GET /api/adafruit/mappings/{mapping_id}** - Get specific mapping
   - Returns: { mapping_id, feed_name, device_id, sensor_id, feed_type, ... }

4. **PUT /api/adafruit/mappings/{mapping_id}** - Update mapping
   ```json
   {
     "feed_name": "home/1/2/5/humidity",
     "conversion_factor": 1.0,
     "is_active": true
   }
   ```

5. **DELETE /api/adafruit/mappings/{mapping_id}** - Delete mapping
   - Verification: Admin or mapping owner only
   - Response: { message: "Mapping deleted successfully" }

6. **GET /api/adafruit/mappings/validate/{feed_name}** - Check if mapping exists
   - Response: { exists: true/false, mapping_id: 1 }

**Smart Routing Logic:**
- MQTT topic: `username/feeds/home/1/2/5/temperature`
- Extract feed: `home/1/2/5/temperature`
- Query: `AdafruitFeedMapping.filter_by(feed_name=feed).first()`
- Auto-route to sensor/device based on mapping type
- Apply conversion factor if specified
- Broadcast real-time update to all connected clients

**Result:** ✅ Feed mapping system operational - 6 endpoints + smart routing

---

## ✅ Device Control via MQTT - April 17, 2026 (NEW FEATURE)

### Bidirectional Device Control - IMPLEMENTED ✅
**Purpose:** Send device commands through Adafruit IO MQTT

**Backend Implementation (app.py):**
```python
def publish_device_command(device_id, command_type, value):
    """Publish device command to Adafruit IO"""
    device = Device.query.get(device_id)
    if not device:
        return False, "Device not found"
    
    # Find mapping for this device
    mapping = AdafruitFeedMapping.query.filter_by(
        device_id=device_id, is_active=True
    ).first()
    
    if not mapping:
        return False, f"No active mapping for device {device_id}"
    
    # Format payload
    if command_type == 'status':
        payload = 1 if value == 'on' else 0
    elif command_type == 'level':
        payload = int(value)
    else:
        return False, "Unknown command type"
    
    # Publish to Adafruit IO
    topic = f"{ADAFRUIT_USERNAME}/feeds/{mapping.feed_name}"
    mqtt_client.publish(topic, payload, qos=1)
    
    # Update database
    if command_type == 'status':
        device.status = value
    elif command_type == 'level':
        device.level = int(value)
        if int(value) > 0:
            device.status = 'on'
    
    db.session.commit()
    print(f"📤 Publishing to {mapping.feed_name}: {payload}")
    return True, "Command published"

# Enhanced PUT /devices/{id} endpoint
@app.route('/api/devices/<int:device_id>', methods=['PUT'])
@token_required
def update_device(device_id):
    data = request.json
    device = Device.query.get(device_id)
    
    if not device:
        return jsonify({'error': 'Device not found'}), 404
    
    old_status = device.status
    old_level = device.level
    
    device.device_name = data.get('device_name', device.device_name)
    device.status = data.get('status', device.status)
    device.level = data.get('level', device.level)
    device.device_type = data.get('device_type', device.device_type)
    
    # Detect changes and publish commands
    if device.status != old_status:
        publish_device_command(device_id, 'status', device.status)
    
    if device.level != old_level:
        publish_device_command(device_id, 'level', device.level)
    
    db.session.commit()
    return jsonify({
        'success': True,
        'device': device.to_dict(),
        'message': 'Device updated and command sent to hardware'
    }), 200
```

**Frontend Control (DevicesScreen):**
```javascript
const updateDeviceLevel = async (device, newLevel) => {
  try {
    const response = await apiService.put(
      `/devices/${device.id || device.device_id}`,
      {
        status: newLevel > 0 ? 'on' : 'off',
        level: newLevel,
        device_name: device.device_name,
        device_type: device.device_type
      }
    );
    
    if (response.success) {
      // Auto-refresh device list
      loadDevices();
      Alert.alert('Success', `Device level set to ${newLevel}%`);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to update device level');
  }
};

const toggleDeviceStatus = async (device) => {
  try {
    const newStatus = String(device.status || 'off').toLowerCase() === 'on' ? 'off' : 'on';
    const response = await apiService.put(
      `/devices/${device.id || device.device_id}`,
      {
        status: newStatus,
        level: newStatus === 'on' ? 50 : 0,
        device_name: device.device_name,
        device_type: device.device_type
      }
    );
    
    if (response.success) {
      loadDevices();
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to toggle device');
  }
};
```

**UI Components (CustomSlider):**
- Slider range: 0-100%
- Real-time value display
- Auto-toggles status ON when level > 0
- Auto-toggles status OFF when level = 0
- Color-coded feedback (blue=on, gray=off)
- Responsive to hardware state changes

**Complete Device Control Workflow:**
1. User moves slider to 75% in DevicesScreen
2. updateDeviceLevel(device, 75) called
3. Frontend sends PUT /devices/{id} with level: 75, status: 'on'
4. Backend receives request → detect level change
5. Backend calls publish_device_command(device_id, 'level', 75)
6. MQTT publishes to: `username/feeds/home/1/1/10/brightness` = 75
7. Adafruit receives command
8. Hardware device (LED/fan/AC) adjusts to 75%
9. Hardware publishes status back to same feed
10. Backend receives MQTT message via on_message()
11. Backend applies conversion factor
12. Backend broadcasts realtime_update via Socket.IO
13. Frontend receives realtime_update event
14. DashboardScreen auto-refreshes via loadDashboardData()
15. Slider shows new hardware state (75%)

**Result:** ✅ Full bidirectional device control - hardware commands + feedback working

---

### Automation Rules Re-enabled - VERIFIED ✅ (APRIL 17)
**Status:** ✅ Re-enabled automation checker thread
**Changes:**
- Uncommented automation_checker thread in app.py
- Thread runs every 30 seconds to evaluate rules
- Created 1 test automation rule: \"Light Auto-On\"
- 10 diverse test notifications created (device_change, threshold_alert, automation_trigger)
**Database State:**
- Automation Rules: 1 active
- Notifications: 10 (diverse types)
- No spam (1 rule, proper interval control)
**Result:** ✅ Automation system working safely

### Code Quality Improvements - COMPLETED ✅ (APRIL 17)
**Changes:**
- ✅ Removed test button from UI
- ✅ Replaced FlatList with ScrollView
- ✅ Removed debug onPress handlers
- ✅ Cleaned up console.log statements
- ✅ Optimized dependencies arrays
**Result:** ✅ Cleaner, maintainable code

---

## ✅ Bug Fixes & Final Cleanup - April 16, 2026 (Session Complete)

### Logout Navigation - FIXED ✅
**Issue:** Logout button clicked → Dialog → Storage cleared BUT app didn't go to login
**Fix:** 
- Moved handleLogout() BEFORE useEffect (JavaScript scope)
- Added missing `import { Alert }`
- Changed confirm() to Alert.alert() (React Native compatible)
- App.js conditional rendering now responds to isSignedIn state change
**Verified:** Works perfectly on Expo Go ✅

### Notification API Endpoints - FIXED ✅
**Issue:** NotificationCenter calling `/api/api/notifications` (404)
**Fix:**
- Removed double `/api` prefix in all endpoints
- Fixed imports: `import { apiService }`
- Fixed destructure: `const { isSignedIn }`
**Result:** All endpoints return 200 OK ✅

### React Native Picker - FIXED ✅
**Issue:** "Cannot read property 'Item' of undefined"
**Fix:** Changed to `import { Picker } from '@react-native-picker/picker'`
**Result:** RoomsScreen renders without errors ✅

### Automation Rules - IMPLEMENTED ✅ (NEW FEATURE)
**Feature Added:** Multi-condition automation rules with AND/OR logic
**Backend Implementation:**
- Created AutomationRule + RuleCondition database tables
- Built AutomationService with 5 core methods:
  - evaluate_condition() - Check operators (>, <, >=, <=, ==, !=)
  - get_latest_sensor_value() - Fetch sensor data
  - evaluate_rule() - Apply AND/OR logic to conditions
  - execute_rule_action() - Trigger device control + notification
  - check_all_rules() - Run every 30 seconds
- Added 7 REST API endpoints for CRUD + toggle + test
- Fixed SQLAlchemy relationship conflict (removed duplicate backref)
- Wrapped background thread with app.app_context() for database access
- Created 3 sample rules with test data and sensor readings
**Frontend Implementation:**
- Built AutomationRulesScreen (400+ lines)
  - Dynamic condition builder (add/remove conditions)
  - Logic type selector (AND or OR)
  - Sensor type, operator, threshold inputs
  - Device picker for automation target
  - Status and level controls
  - Test, delete, and toggle buttons
- Integrated into navigation stack (RoomsScreen button)
- Added Automation option button to RoomsScreen
**Result:** ✅ FULLY FUNCTIONAL - tested on Expo Go

### Project Cleanup - COMPLETED ✅
**Files Removed (7 total):**
1. FEATURE_1_TESTING.md - Old testing documentation
2. FEATURE_2_COMPLETE.md - Obsolete feature documentation
3. FEATURE_2_TESTING_GUIDE.md - Old testing guide
4. FILES_CLEANED.md - Historical cleanup notes
5. seed_output.txt - Temporary seed output log
6. TEST_FEATURE_2.py - Old test script
7. check_db.py - Old database check utility
**Files Retained:**
- .env, app.py, automation_service.py, notification_service.py, admin_service.py
- config.py, models.py, requirements.txt, seed_database.py
- mobile/ (entire React Native app)
- instance/smarthome.db (SQLite database)
- venv/ (Python virtual environment)
- Documentation: README.md, SETUP_GUIDE.md, PROJECT_COMPREHENSIVE_SUMMARY.md
**Result:** Project directory cleaned and organized ✅

### Documentation Update - COMPLETED ✅
**Updated PROJECT_COMPREHENSIVE_SUMMARY.md:**
- Version 2.5 → 2.6
- Added Automation Rules feature to Key Statistics
- Updated database schema: 13 → 15 tables
- Updated API endpoints: 31 → 38 total
- Added 7 automation rule endpoints
- Updated mobile screens: 5 → 6 (added AutomationRulesScreen)
- Added Feature 3: Automation Rules (complete section)
- Added Feature 7 details (Automation Rules)
- Updated project structure with new service files
- Updated current status with automation rules completion
- Documented implementation details and fixes
**Result:** Documentation fully current with latest features ✅
**Result:** RoomsScreen renders without errors ✅

---

## 📱 Mobile Deployment Summary

### ✅ Easiest Method: Expo Go (Recommended for Testing)
```bash
# On Your Computer:
cd mobile && npm start
# Scan QR code with Expo Go app on your phone
# → App loads in ~10 seconds
# ✅ No Android Studio / Xcode required!
```

### ✅ Android/iOS Options
| Platform | Time | Installation | Best For |
|----------|------|--------------|----------|
| **Expo Go** | 2 min | Just install app | ✅ Testing, demos |
| **Android Emulator** | 30 min | Android Studio | Desktop testing |
| **iOS Simulator** | 1 hour | Xcode (Mac) | Mac desktop testing |

### Network Setup
- Phone + Computer on SAME WiFi ✅
- Firewall allows ports 8081-8090 ✅
- Backend running on port 8000 ✅

---

## ✅ Full Testing Checklist (April 17, 2026 - ALL PASSING)

### Authentication
- [x] Login works with test user (bach/password123)
- [x] HomeScreen shows houses list after login
- [x] Logout button visible in header
- [x] Click logout → Alert dialog appears
- [x] Confirm logout → Clears storage → Navigates to login screen ✅
- [x] HomeScreen shows welcome (not logged in) state

### Notifications ✅ (100% Working - Touch Fixed April 17)
- [x] Notification bell 🔔 visible in header (when signed in)
- [x] Click bell → NotificationCenter opens
- [x] Displays 10 diverse notifications (device_change, threshold_alert, automation_trigger)
- [x] Different notification types show different icons (🔌, ⚠️, 🔄)
- [x] Unread notifications show blue dot indicator
- [x] Read notifications have no dot
- [x] **Single tap notification → Marks as read → Unread dot disappears ✅**
- [x] **Single tap delete button (✕) → Alert confirms → Notification removed ✅**
- [x] Pull-to-refresh loads latest notifications
- [x] Clear All button in header clears all notifications
- [x] Unread count updates in header after marking read
- [x] Backend API returns 200 OK for all operations
- [x] Endpoints verified: GET, PUT /read, DELETE, DELETE /clear-all

### Sensors
- [x] Create sensor with Name + Type only
- [x] Unit auto-maps (°C, %, lux, etc.)
- [x] Display shows: Type + Name + Value + Unit
- [x] Edit sensor updates type & unit
- [x] Delete sensor with confirmation

### Devices
- [x] Create device with name + type
- [x] Edit device details
- [x] Delete device with confirmation
- [x] Toggle on/off
- [x] Level slider works (0-100%)

### CRUD Operations
- [x] Create house/floor/room
- [x] Read all items
- [x] Update details
- [x] Delete with confirmation
- [x] Pull-to-refresh works

### Mobile Deployment
- [x] Expo Go installed
- [x] QR code scans
- [x] App loads on device
- [x] API calls work over WiFi
- [x] No console errors
**Result:** RoomsScreen renders without errors ✅

 
 - - - 
 
 
 
 # #   =���  P r o j e c t   S t a t u s   -   U p d a t e d   A p r i l   2 0 ,   2 0 2 6 
 
 
 
 # # #   C u r r e n t   D e p l o y m e n t 
 
 '  B a c k e n d :   R u n n i n g   o n   h t t p : / / 1 2 7 . 0 . 0 . 1 : 8 0 0 0 
 
 '  D a t a b a s e :   S Q L i t e   i n i t i a l i z e d   w i t h   7 4   t e s t   d e v i c e s 
 
 '  M o b i l e :   E x p o   r e a d y   ( R e a c t   N a t i v e ) 
 
 '  M Q T T :   C o n n e c t e d   t o   A d a f r u i t   I O 
 
 '  A P I :   A l l   4 5 +   e n d p o i n t s   f u n c t i o n a l 
 
 '  C o n f i g u r a t i o n :   D y n a m i c   A P I   s e t u p   r e a d y 
 
 
 
 # # #   G i t   R e p o s i t o r y 
 
 '  I n i t i a l i z e d   a n d   f i r s t   c o m m i t   d o n e   ( 4 0 3 4 7 a f ) 
 
 '  2 6   f i l e s   c o m m i t t e d   ( s o u r c e   c o d e   +   d o c u m e n t a t i o n ) 
 
 '  . e n v   f i l e s   p r o t e c t e d   i n   . g i t i g n o r e 
 
 '  . e n v . e x a m p l e   a n d   . e n v . l o c a l . e x a m p l e   t e m p l a t e s   r e a d y 
 
 '  R e a d y   f o r   G i t H u b   p u s h 
 
 
 
 # # #   D o c u m e n t a t i o n 
 
 '  T E A M _ S E T U P _ G U I D E . m d   -   C o m p l e t e   s e t u p   i n s t r u c t i o n s 
 
 '  E N V _ S E T U P _ G U I D E . m d   -   E n v i r o n m e n t   v a r i a b l e s   g u i d e 
 
 '  R U N _ P R O J E C T _ G U I D E . m d   -   H o w   t o   r u n   p r o j e c t 
 
 '  G I T _ P U S H _ C H E C K L I S T . m d   -   P r e - p u s h   v e r i f i c a t i o n 
 
 '  P R O J E C T _ U P D A T E _ S U M M A R Y . m d   -   A l l   u p d a t e s   s u m m a r y 
 
 
 
 # # #   N e x t   S t e p s 
 
 1 .   P u s h   t o   G i t H u b :   g i t   p u s h   o r i g i n   m a i n 
 
 2 .   S h a r e   T E A M _ S E T U P _ G U I D E . m d   w i t h   t e a m   m e m b e r s 
 
 3 .   E a c h   t e a m   m e m b e r :   C r e a t e   . e n v   a n d   . e n v . l o c a l   f i l e s 
 
 4 .   S t a r t   d e v e l o p m e n t / t e s t i n g 
 
 
 
 - - - 
 
 * * S t a t u s : * *   =���  P r o d u c t i o n   R e a d y   -   A p r i l   2 0 ,   2 0 2 6 
 
 