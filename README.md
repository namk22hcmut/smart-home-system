# 🏠 Smart Home IoT Management System

**Status:** ✅ Production Ready | **Version:** 3.1  
**Last Updated:** May 9, 2026 | **Team:** Bach, NamKZ

---

## 📖 Tài Liệu Chính

Để bắt đầu, chọn một trong các tài liệu dưới:

| Tài Liệu | Mục Đích |
|---------|---------|
| **[SETUP.md](./SETUP.md)** 🚀 | **Bắt đầu tại đây!** - Cài đặt & chạy project (15 min) |
| **[PROJECT_DETAILS.md](./PROJECT_DETAILS.md)** 📋 | Tổng quan chi tiết dự án cho Agent (5 min read) |
| **[PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)** 📚 | Tài liệu hoàn chỉnh: Architecture, 45+ API endpoints, Database |

---

## ✨ Tính năng Chính

✅ **REST API** - 45+ endpoints cho quản lý house/floor/room/device/sensor  
✅ **Device Control** - On/Off + Level slider (0-100%)  
✅ **Real-time Sync** - Socket.IO WebSocket updates  
✅ **MQTT Integration** - Adafruit IO cloud sync  
✅ **Mobile App** - React Native + Expo (iOS/Android/Web)  
✅ **Automation Rules** - Multi-condition rules với AND/OR logic  
✅ **Database** - SQLite + 16 tables (user, house, floor, room, device, sensor, etc.)  
✅ **Notifications** - Real-time alerts & system notifications  

---

## 🏗️ Cấu trúc Project

```
New folder/
├── 🐍 app.py                          # Backend Flask API
├── 🐍 models.py                       # SQLAlchemy ORM
├── 🐍 config.py                       # Configuration
├── 🐍 automation_service.py           # Automation engine
├── 🐍 notification_service.py         # Notification service
├── 📄 requirements.txt                # Python dependencies
│
├── 📱 mobile/                         # React Native App
│   ├── 📄 app.config.js              # Expo config
│   ├── 📄 package.json               # npm dependencies
│   └── src/
│       ├── screens/                  # 6 main screens
│       ├── services/                 # API, Auth, Realtime
│       └── context/                  # Auth context
│
├── 📁 instance/                       # SQLite database
├── 📁 venv/                          # Python virtual env
│
└── 📚 Documentation/
    ├── SETUP.md                      # Setup & running
    ├── PROJECT_COMPREHENSIVE_SUMMARY # Full documentation
    └── README.md                     # This file
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

**Create house:**
```bash
curl -X POST http://localhost:8000/api/houses \
  -H "Content-Type: application/json" \
  -d '{"name":"New House","address":"123 Main","city":"City","country":"Country"}'
```

**Update device level:**
```bash
curl -X POST http://localhost:8000/api/device-status \
  -H "Content-Type: application/json" \
  -d '{"device_id":1,"status":"on","level":75}'
```

👉 Xem [PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md) để xem đầy đủ 45+ endpoints

---

## ⚙️ Cấu Hình

**Backend (`.env`):**
- `ADAFRUIT_USERNAME` - Adafruit account
- `ADAFRUIT_KEY` - Adafruit API key
- `SECRET_KEY` - JWT secret

**Mobile (`.env.local`):**
- `EXPO_PUBLIC_API_URL` - Backend API URL (localhost, LAN IP, emulator)

👉 Chi tiết: [SETUP.md - Cấu hình môi trường](./SETUP.md#-cấu-hình-môi-trường)

---

## 📊 Công Nghệ

| Layer | Technology |
|-------|-----------|
| **Backend API** | Flask 3.0 + SQLAlchemy 2.0 |
| **Database** | SQLite (16 tables) |
| **Real-time** | Socket.IO + WebSocket |
| **MQTT** | Paho (Adafruit IO) |
| **Mobile** | React Native + Expo |
| **Mobile Navigation** | React Navigation 6.x |
| **Auth** | JWT + AsyncStorage |

---

## 🚀 Next Steps

1. **Bắt đầu:** Đọc [SETUP.md](./SETUP.md)
2. **Chi tiết:** Xem [PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)
3. **Contribute:** Clone project & setup theo hướng dẫn

---

## 📞 Support

- 🐛 **Bug Report:** Tạo issue trên GitHub
- 💬 **Questions:** Liên hệ team members
- 📖 **Documentation:** Xem tài liệu đầy đủ bên dưới

---

**Made with ❤️ by Smart Home Team**
