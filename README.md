# 🏠 Smart Home IoT Management System

**Status:** ✅ Production Ready | **Version:** 3.3  
**Last Updated:** May 13, 2026 | **Team:** Bach, NamKZ

> **🧹 Latest Update (v3.3.1):** Project cleanup completed - removed 6 redundant files (REORGANIZATION_REPORT.py, check_data.py, setup_database.py, DemoTestScreen.js, DeviceSchedulesScreen.js, ON_DEMAND_STRATEGY.md). See [PROJECT_CLEANUP_AUDIT.md](./PROJECT_CLEANUP_AUDIT.md) for details.

---

## 📖 Tài Liệu Chính

👉 **[Xem Documentation Index](./docs/INDEX.md)** để tìm tài liệu phù hợp

Để bắt đầu nhanh, chọn một trong các tài liệu dưới:

Hoặc xem tài liệu gộp duy nhất: [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)

| Tài Liệu | Mục Đích |
|---------|---------|
| **[docs/SETUP.md](./docs/SETUP.md)** 🚀 | **Bắt đầu tại đây!** - Cài đặt & chạy project (15 min) |
| **[docs/PROJECT_DETAILS.md](./docs/PROJECT_DETAILS.md)** 📋 | Tổng quan chi tiết dự án (5 min read) |
| **[docs/IMPLEMENTATION_SUMMARY_v3.3.md](./docs/IMPLEMENTATION_SUMMARY_v3.3.md)** ⚙️ | Hướng dẫn chi tiết phiên bản 3.3 - Schedule System |
| **[docs/SCHEDULE_API_DOCUMENTATION.md](./docs/SCHEDULE_API_DOCUMENTATION.md)** 📚 | API documentation cho Device Scheduling |
| **[docs/PROJECT_COMPREHENSIVE_SUMMARY.md](./docs/PROJECT_COMPREHENSIVE_SUMMARY.md)** 📖 | Tài liệu hoàn chỉnh: Architecture, 50+ endpoints, Database |

---

## ✨ Tính năng Chính

✅ **REST API** - 50+ endpoints cho quản lý house/floor/room/device/sensor  
✅ **Device Control** - On/Off + Level slider (0-100%)  
✅ **Device Scheduling** - Real-time schedule executor với duration constraints  
✅ **Auto-Off Tracking** - Tự động tắt device sau N phút  
✅ **Real-time Sync** - Socket.IO WebSocket updates  
✅ **MQTT Integration** - Adafruit IO cloud sync  
✅ **Mobile App** - React Native + Expo (iOS/Android/Web)  
✅ **Automation Rules** - Multi-condition rules với AND/OR logic  
✅ **Database** - SQLite + 20 tables với Schedule system  
✅ **Notifications** - Real-time alerts & system notifications  
✅ **Activity Logging** - Audit trail cho tất cả actions  

---

## 🏗️ Cấu trúc Project

```
New folder/
├── 🐍 app.py                          # Backend Flask API (50+ endpoints)
├── 🐍 models.py                       # SQLAlchemy ORM (20 tables)
├── 🐍 config.py                       # Configuration
├── 🐍 admin_service.py                # Admin functionality
├── 🐍 automation_service.py           # Automation engine
├── 🐍 notification_service.py         # Notification service
├── 📄 requirements.txt                # Python dependencies
│
├── 📱 mobile/                         # React Native App
│   ├── 📄 app.config.js              # Expo config
│   ├── 📄 package.json               # npm dependencies
│   └── src/
│       ├── screens/                  # Main screens
│       │   ├── DeviceSchedulesScreen # NEW: Schedule CRUD UI
│       │   └── ...
│       ├── services/                 # API, Auth, Realtime
│       └── context/                  # Auth context
│
├── 📁 scripts/                        # Database & seed scripts
│   ├── init_db.py                    # Database initialization
│   ├── add_auto_off_tracking.py      # Schema migration
│   └── seed_database.py              # Test data seeding
│
├── 📁 docs/                           # Documentation
│   ├── SETUP.md                      # Setup guide
│   ├── PROJECT_DETAILS.md            # Project overview
│   ├── IMPLEMENTATION_SUMMARY_v3.3.md # Implementation details
│   ├── SCHEDULE_API_DOCUMENTATION.md # Schedule API reference
│   └── PROJECT_COMPREHENSIVE_SUMMARY.md # Complete documentation
│
├── 📁 instance/                       # Instance files
│   └── smarthome.db                  # SQLite database
│
├── 📁 templates/                      # HTML templates
├── 📁 venv/                          # Python virtual environment
└── .env, .gitignore, requirements.txt
```

---

## ⚡ Quick Start (2 Menit)

### Prerequisites
- Python 3.9+, Node.js 18+, npm 9+

### Terminal 1 - Backend
```bash
# Activate environment
.\venv\Scripts\Activate.ps1

# Run backend
python app.py
# ✅ Backend runs on http://localhost:8000
```

### Terminal 2 - Mobile
```bash
cd mobile
npm start
# ✅ Chọn platform: w (web), a (Android), i (iOS)
```

### Login
```
Username: bach
Password: password123
```

---

## 🔌 API Examples

**Get all devices:**
```bash
curl http://localhost:8000/api/devices/status
```

**Create device schedule:**
```bash
curl -X POST http://localhost:8000/api/devices/1/schedules \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_time":"14:30",
    "action_status":"on",
    "action_level":80,
    "duration_minutes":120,
    "days_of_week":"1,2,3,4,5"
  }'
```

**Get device schedules:**
```bash
curl http://localhost:8000/api/devices/1/schedules \
  -H "Authorization: Bearer <TOKEN>"
```

**Update device level:**
```bash
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id":1,"status":"on","level":75}'
```

👉 Xem [docs/SCHEDULE_API_DOCUMENTATION.md](./docs/SCHEDULE_API_DOCUMENTATION.md) để xem Schedule API  
👉 Xem [docs/PROJECT_COMPREHENSIVE_SUMMARY.md](./docs/PROJECT_COMPREHENSIVE_SUMMARY.md) để xem đầy đủ 50+ endpoints

---

## ⚙️ Cấu Hình

**Backend (`.env`):**
- `ADAFRUIT_USERNAME` - Adafruit account
- `ADAFRUIT_KEY` - Adafruit API key
- `SECRET_KEY` - JWT secret

**Mobile (`.env.local`):**
- `EXPO_PUBLIC_API_URL` - Backend API URL (localhost, LAN IP, emulator)

👉 Chi tiết: [docs/SETUP.md - Cấu hình môi trường](./docs/SETUP.md#-cấu-hình-môi-trường)

---

## 📊 Công Nghệ

| Layer | Technology |
|-------|-----------|
| **Backend API** | Flask 3.0 + SQLAlchemy 2.0 |
| **Database** | SQLite (20 tables) |
| **Scheduling** | Background executor (60s check) |
| **Real-time** | Socket.IO + WebSocket |
| **MQTT** | Paho (Adafruit IO) |
| **Mobile** | React Native + Expo |
| **Mobile Navigation** | React Navigation 6.x |
| **Auth** | JWT + AsyncStorage |

---

## 🚀 Next Steps

1. **Bắt đầu:** Đọc [docs/SETUP.md](./docs/SETUP.md)
2. **Schedule System:** Xem [docs/IMPLEMENTATION_SUMMARY_v3.3.md](./docs/IMPLEMENTATION_SUMMARY_v3.3.md)
3. **Schedule API:** Xem [docs/SCHEDULE_API_DOCUMENTATION.md](./docs/SCHEDULE_API_DOCUMENTATION.md)
4. **Chi tiết:** Xem [docs/PROJECT_COMPREHENSIVE_SUMMARY.md](./docs/PROJECT_COMPREHENSIVE_SUMMARY.md)
5. **Contribute:** Clone project & setup theo hướng dẫn

---

## 📞 Support

- 🐛 **Bug Report:** Tạo issue trên GitHub
- 💬 **Questions:** Liên hệ team members
- 📖 **Documentation:** Xem tài liệu đầy đủ trong `docs/` folder

---

**Made with ❤️ by Smart Home Team**
