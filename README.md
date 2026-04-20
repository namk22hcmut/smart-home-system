# 🏠 Smart Home Backend - Complete Implementation

## ✅ Project Status: READY TO DEPLOY

This is a **rebuilt from scratch** Smart Home system with proper **level column** support from day 1.

---

## 📦 What's Included

✅ **13 Database Tables** (PostgreSQL)
✅ **20+ REST API Endpoints** with level control
✅ **Device Level Support** (0-100% scale) - ⭐ **Properly defined in models.py**
✅ **MQTT Integration** (Adafruit IO)
✅ **Auto-seed** with 100+ test devices + sensors
✅ **Flask Backend** with SQLAlchemy ORM

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Setup Database
```bash
# PostgreSQL: Create user and database
psql -U postgres
CREATE USER smarthome_user WITH PASSWORD 'Smarthome@2024';
CREATE DATABASE smarthome_db OWNER smarthome_user;
```

### 3. Seed Data
```bash
python seed_database.py
# Creates: 5 houses, 50+ devices with level, sensors
```

### 4. Run Backend
```bash
python app.py
# Backend runs on: http://localhost:8000
```

---

## 🔌 Key Endpoints

### Device Level Control (⭐ NEW)

**Get All Devices with Level:**
```bash
GET http://localhost:8000/api/devices/status
```
Response:
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "Main Light", "type": "light", "status": "on", "level": 75},
    {"id": 2, "name": "Ceiling Fan", "type": "fan", "status": "on", "level": 50}
  ]
}
```

**Update Device Level:**
```bash
POST http://localhost:8000/api/device-status
Content-Type: application/json

{
  "device_id": 1,
  "status": "on",
  "level": 75
}
```

### Core API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/houses` | GET/POST | List/create houses |
| `/api/houses/{id}/floors` | GET | Get floors in house |
| `/api/floors/{id}/rooms` | GET | Get rooms in floor |
| `/api/rooms/{id}/devices` | GET | Get devices in room |
| `/api/room/{id}/sensors` | GET | Get sensors in room |
| `/api/devices/status` | GET | Get all devices with level |
| `/api/device-status` | POST | Update device status + level |
| `/api/sensor-data` | POST | Log sensor reading |
| `/api/sensor-data/latest` | GET | Get latest sensor data |
| `/api/sensors/{id}/data` | GET | Get sensor history |
| `/api/alerts` | GET | Get unread alerts |

---

## 📊 Database Schema

**Device Table** (with ✅ Level Column):
```sql
CREATE TABLE device (
    device_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL,
    device_name VARCHAR(150),
    device_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'off',
    level INTEGER DEFAULT 0,              -- ⭐ 0-100%
    connection_status VARCHAR(20),
    mac_address VARCHAR(17),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🧪 Test Backend

```bash
# Health check
curl http://localhost:8000/api/health

# Get all houses
curl http://localhost:8000/api/houses

# Get all devices with level
curl http://localhost:8000/api/devices/status

# Update device level
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id": 1, "status": "on", "level": 75}'
```

---

## 📁 Project Structure

```
Smart Home Backend/
├── app.py                   # Flask backend (20+ endpoints)
├── models.py               # 13 SQLAlchemy ORM models ⭐ WITH LEVEL
├── config.py               # Configuration
├── .env                     # Environment variables
├── requirements.txt        # Dependencies
├── seed_database.py        # Populate test data (100+ devices)
├── PROJECT_COMPREHENSIVE_SUMMARY.md  # Full documentation
└── README.md              # This file
```

---

## 🎮 Device Level (0-100%)

| Level | Meaning |
|-------|---------|
| 0 | OFF |
| 1-99 | Partial intensity |
| 100 | Maximum intensity |

**Example:**
- Light: 0% off, 75% = 75% brightness
- Fan: 0% off, 50% = 50% speed
- TV: 100% full power

**Frontend Controller:**
```javascript
// Slider: 0-100
<input type="range" min="0" max="100" 
       onchange="updateLevel(deviceId, this.value)">
```

---

## 🔗 Next: Frontend

After backend is working, create frontend:
- React, React Native, or Next.js
- Connects to this Backend API
- Port 5000 (frontend proxy)
- Real-time device control with level slider

---

## 📝 Notes

- **Level Column:** Defined in `models.py` → `Device.level = db.Column(db.Integer, default=0)`
- **Database:** Auto-creates on `app.py` startup
- **Seeding:** `seed_database.py` creates 5 houses + 100+ devices + sensors
- **MQTT:** Connects to Adafruit IO (optional)
- **Error Handling:** All endpoints return proper HTTP codes

---

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Check PostgreSQL
psql -U smarthome_user -d smarthome_db -c "SELECT 1"

# Check .env has DATABASE_URL
cat .env | grep DATABASE_URL
```

**Devices not showing level:**
```bash
# Check device table
python -c "from app import app; from models import db, Device; app.app_context().push(); print(Device.query.first().level)"
```

---

**Created:** April 16, 2026  
**Status:** ✅ OPERATIONAL
