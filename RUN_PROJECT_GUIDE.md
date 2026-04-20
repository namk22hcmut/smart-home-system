# 🚀 Hướng dẫn Chạy Smart Home Project

**Ngày:** April 20, 2026  
**Status:** Ready to Test  
**Mục đích:** Verify Backend + Mobile API Integration

---

## 📊 Cấu trúc Project

```
┌─────────────────────────────────────────────────────────┐
│ BACKEND (Python Flask)                                  │
│ Port: 8000                                              │
│ Database: SQLite (smarthome.db)                        │
│ Features: REST API, JWT Auth, MQTT, WebSocket         │
└──────────────────┬──────────────────────────────────────┘
                   │
        API (http://localhost:8000)
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐    ┌────────▼────────┐
│ MOBILE WEB   │    │ MOBILE APP      │
│ Browser      │    │ Expo React      │
│ Port: 3000   │    │ (iOS/Android)   │
└──────────────┘    └─────────────────┘
```

---

## 📋 Chuẩn bị (Chỉ lần đầu)

### Step 1: Kiểm tra Python & Node
```bash
python --version
# Output: Python 3.9+ ✅

node --version
# Output: v18+ ✅

npm --version
# Output: 9+ ✅
```

### Step 2: Kiểm tra Virtual Environment Backend
```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"

# Nếu venv chưa tạo
python -m venv venv

# Activate venv
.\venv\Scripts\Activate.ps1
# Output: (venv) C:\Users\namkz\...> ✅

# Cài dependencies
pip install -r requirements.txt
# Output: Successfully installed ... ✅
```

### Step 3: Kiểm tra File Config Backend
```bash
# Kiểm tra .env file
cat .env

# Output nên chứa:
# ADAFRUIT_USERNAME=your_adafruit_username
# ADAFRUIT_KEY=your_adafruit_key
# DATABASE_URL=sqlite:///smarthome.db
# ✅ Tất cả có rồi
```

### Step 4: Kiểm tra Config Mobile
```bash
# Kiểm tra mobile/.env.local
cd mobile
type .env.local

# Output nên chứa:
# EXPO_PUBLIC_API_URL=http://10.149.160.114:8000/api
# ✅ IP backend của bạn đúng
```

---

## 🚀 Chạy Project (Chạy lần này)

### **Terminal 1: Backend API** ⭐ Chạy trước tiên

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"
.\venv\Scripts\Activate.ps1

# Xoá database cũ (nếu có) để reset
# Uncomment dòng này nếu muốn reset:
# del instance\smarthome.db

python app.py
```

**Kết quả mong đợi:**
```
✅ *** Running on http://127.0.0.1:8000
WARNING in app.run_simple: This is a development server. Do not use it in production environments.
```

**Kiểm tra:** Mở browser → `http://localhost:8000/api/health`  
✅ Kết quả:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-20T..."
}
```

---

### **Terminal 2: Seed Test Data (Nếu muốn có dữ liệu test)**

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"
.\venv\Scripts\Activate.ps1

python seed_database.py
```

**Kết quả mong đợi:**
```
✅ Database cleared and recreated
✅ Created 10+ users (admin, regular users)
✅ Created 5 houses with floors, rooms
✅ Created 100+ devices with level control
✅ Created sensors and data
Database seeding complete! ✅
```

**Test Data:**
- Users: `bach/password123`, `admin/admin123`
- 5 Houses, 50+ Devices, Sensors

---

### **Terminal 3: Mobile App (Expo)**

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder\mobile"

# Nếu node_modules chưa cài
npm install

# Chạy Expo
npm start
# hoặc: npx expo start
```

**Kết quả mong đợi:**
```
✅ Expo DevTools is running at ws://localhost:19000
✅ Local:     exp://127.0.0.1:19000
```

**Chọn platform:**
- `w` - Web (Browser)
- `a` - Android Emulator
- `i` - iOS Simulator
- `--tunnel` - Physical device over internet

---

## ✅ Testing Workflow

### 1️⃣ Test Backend API (Postman / Browser)

**Health Check:**
```
GET http://localhost:8000/api/health
```
✅ Response: `{"status": "healthy"}`

**Login:**
```
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "username": "bach",
  "password": "password123"
}
```
✅ Response:
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLC...",
  "user": {
    "id": 1,
    "username": "bach",
    "role": "user"
  }
}
```

**Get All Houses:**
```
GET http://localhost:8000/api/houses
Authorization: Bearer <TOKEN>
```
✅ Response: List of houses

**Get Devices with Status:**
```
GET http://localhost:8000/api/devices/status
Authorization: Bearer <TOKEN>
```
✅ Response: Devices with level (0-100)

---

### 2️⃣ Test Mobile App (Expo Web)

**Mở browser:** `http://localhost:19000` hoặc `exp://localhost:19000`

**Test Flow:**
1. ✅ App loads
2. ✅ See Login screen
3. ✅ Login: `bach` / `password123`
4. ✅ See Dashboard
5. ✅ See Devices list
6. ✅ Can control device level (slider)
7. ✅ Real-time updates

**Nếu có lỗi:**
```
❌ Network error: connect ECONNREFUSED
→ Backend chưa chạy hoặc port 8000 bị block
→ Kiểm tra: http://localhost:8000/api/health

❌ Cannot read property 'expoConfig'
→ Reload Expo: Ctrl+C, rồi npm start
```

---

### 3️⃣ Test API Integration (Mobile ↔ Backend)

**Flow kiểm tra:**

```
1. Mobile app starts
   ↓
2. Load Constants từ .env.local
   EXPO_PUBLIC_API_URL = "http://10.149.160.114:8000/api"
   ↓
3. Login: POST /api/auth/login
   ↓
4. Backend xác thực, trả token
   ↓
5. Mobile lưu token
   ↓
6. Mobile fetch devices: GET /api/devices/status
   (Authorization: Bearer <token>)
   ↓
7. Backend trả devices list
   ↓
8. Mobile display devices
```

**Kiểm tra logs:**

Backend logs:
```
INFO:werkzeug: 127.0.0.1 - - [20/Apr/2026 ...] POST /api/auth/login HTTP/1.1 200 -
INFO:werkzeug: 127.0.0.1 - - [20/Apr/2026 ...] GET /api/devices/status HTTP/1.1 200 -
```

Mobile logs (Expo):
```
ℹ️  [apiClient] 📍 Token from storage: ✅ Found
ℹ️  [apiClient] ✅ Authorization header SET for /devices/status
ℹ️  [apiClient] ✅ Response: 50 devices
```

---

## 🧪 Kiểm Tra Chi Tiết

### Backend Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | ❌ | Health check |
| `/api/auth/login` | POST | ❌ | Login |
| `/api/auth/register` | POST | ❌ | Register user |
| `/api/houses` | GET | ✅ | Get all houses |
| `/api/devices/status` | GET | ✅ | Get devices |
| `/api/device-status` | POST | ✅ | Update device level |
| `/api/sensors/{id}/data` | GET | ✅ | Get sensor history |
| `/api/alerts` | GET | ✅ | Get alerts |

### Test Credentials

| Username | Password | Role | Status |
|----------|----------|------|--------|
| bach | password123 | user | active |
| admin | admin123 | admin | active |
| testuser | password123 | user | active |

---

## 🔍 Debugging

### Backend Issues

**Lỗi: ModuleNotFoundError**
```bash
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Lỗi: Database locked**
```bash
# Xoá database cũ
del instance\smarthome.db
python seed_database.py
```

**Lỗi: Port 8000 bị sử dụng**
```bash
# Tìm process sử dụng port 8000
netstat -ano | findstr :8000

# Kill process (thay PID)
taskkill /PID <PID> /F
```

### Mobile Issues

**Lỗi: Cannot connect Backend**
```bash
# Kiểm tra API URL
cd mobile
type .env.local

# Nên là: EXPO_PUBLIC_API_URL=http://10.149.160.114:8000/api
# Thay IP nếu sai
```

**Lỗi: Expo cache**
```bash
# Clear Expo cache
npx expo start --clear
```

---

## 📝 Test Checklist

### Backend ✅
- [ ] Virtual environment activated
- [ ] Dependencies installed
- [ ] .env file có Adafruit keys
- [ ] Database được seed
- [ ] API health check: ✅ 200
- [ ] Login: ✅ Get token
- [ ] Get devices: ✅ See devices
- [ ] Update device level: ✅ Success

### Mobile ✅
- [ ] npm install thành công
- [ ] Expo start hoạt động
- [ ] App loads trên web/emulator
- [ ] Login page hiển thị
- [ ] Login với bach/password123: ✅ Success
- [ ] Dashboard loads: ✅ See houses
- [ ] Devices tab: ✅ See devices list
- [ ] Control device: ✅ Slider works
- [ ] Real-time update: ✅ Live changes

---

## 🎯 Success Criteria

✅ Tất cả tests pass → **Ready to Push GitHub!**

Nếu lỗi:
1. Kiểm tra logs (Backend + Mobile)
2. Xem Debugging section
3. Hỏi AI assistant 😊

---

## 📚 Tài liệu bổ sung

- Backend docs: [README.md](./README.md)
- Environment setup: [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- API endpoints: See README.md
- Test data: [seed_database.py](./seed_database.py)

---

**Chúc bạn test thành công! 🎉**
