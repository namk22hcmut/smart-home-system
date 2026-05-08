# 🚀 Smart Home Project - Setup & Running Guide

**Last Updated:** May 9, 2026  
**Status:** ✅ Production Ready

---

## 📋 Mục Lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt lần đầu](#cài-đặt-lần-đầu)
3. [Cấu hình môi trường](#cấu-hình-môi-trường)
4. [Chạy Backend](#chạy-backend)
5. [Chạy Mobile App](#chạy-mobile-app)
6. [Hướng dẫn Team](#hướng-dẫn-team)
7. [Kiểm tra & Testing](#kiểm-tra--testing)

---

## ✅ Yêu cầu hệ thống

**Phần mềm bắt buộc:**
- Python 3.9+ (kiểm tra: `python --version`)
- Node.js 18+ (kiểm tra: `node --version`)
- npm 9+ (kiểm tra: `npm --version`)
- Git (để clone project)

**Tài khoản bên ngoài:**
- Adafruit IO account - https://io.adafruit.com (để lấy API key)

**Thiết bị di động (tùy chọn):**
- Android Emulator hoặc thiết bị Android
- iOS Simulator (macOS) hoặc iPhone
- Hoặc chạy trên web browser

---

## 🔧 Cài đặt lần đầu

### Bước 1: Clone hoặc giải nén project

```bash
# Nếu clone từ GitHub
git clone <repository-url>
cd "New folder"

# Hoặc nếu đã giải nén, chỉ cần cd vào folder
```

### Bước 2: Setup Backend (Python)

```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# ❌ Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# ❌ Windows (CMD):
venv\Scripts\activate

# ❌ macOS/Linux:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### Bước 3: Setup Mobile (React Native)

```bash
cd mobile

# Cài đặt npm dependencies
npm install

cd ..
```

---

## ⚙️ Cấu hình môi trường

### Backend Configuration (`.env`)

**Bước 1:** Tạo file `.env` từ template

```bash
copy .env.example .env
# macOS/Linux: cp .env.example .env
```

**Bước 2:** Chỉnh sửa `.env` file

Mở file `.env` và điền thông tin:

```env
# Flask Environment
FLASK_ENV=development

# Database
DATABASE_URL=sqlite:///smarthome.db

# Security Keys (CHANGE IN PRODUCTION!)
SECRET_KEY=your-secret-key-change-me
JWT_SECRET=your-jwt-secret-change-me

# Adafruit IoT Configuration (REQUIRED!)
ADAFRUIT_USERNAME=your-adafruit-username
ADAFRUIT_KEY=your-adafruit-api-key

# Backend API URL
BACKEND_API_URL=http://localhost:8000
```

**Cách lấy Adafruit Credentials:**

1. Truy cập: https://io.adafruit.com/settings/keys
2. Copy **Username**
3. Copy **Active Key**
4. Paste vào `.env` file

**⚠️ Quan trọng:** Đừng commit `.env` file - nó chứa credentials nhạy cảm!

---

### Mobile Configuration (`.env.local`)

**Bước 1:** Tạo file `.env.local` từ template

```bash
cd mobile
copy .env.local.example .env.local
# macOS/Linux: cp .env.local.example .env.local
cd ..
```

**Bước 2:** Chỉnh sửa `.env.local` file

Chọn một trong các cấu hình dưới:

**A. Chạy trên Localhost (Web/Emulator)**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

**B. Chạy trên Thiết bị vật lý (LAN)**
```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000/api
```
Cách tìm IP:
```powershell
ipconfig
# Tìm "IPv4 Address" - ví dụ: 192.168.1.100
```

**C. Android Emulator**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

**D. iOS Simulator**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🚀 Chạy Backend

### Terminal 1 - Kích hoạt Virtual Environment

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"

# Kích hoạt venv
.\venv\Scripts\Activate.ps1

# Kiểm tra venv đã kích hoạt (terminal sẽ hiển thị "(venv)" ở đầu)
```

### Khởi chạy Backend

```bash
python app.py

# Output mong đợi:
# ✅ Running on http://127.0.0.1:8000
# ✅ Database initialized (sqlite)
# ✅ MQTT connected to Adafruit
# ✅ Socket.IO initialized
```

**Kiểm tra Backend hoạt động:**

Mở browser và truy cập:
- Health check: `http://localhost:8000/api/health`
- Get houses: `http://localhost:8000/api/houses`

---

## 📱 Chạy Mobile App

### Terminal 2 - Mở terminal mới (giữ Backend chạy)

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder\mobile"

# Khởi chạy Expo
npm start
```

### Chọn Platform

Sau khi `npm start`, bạn sẽ thấy menu:

```
› Press a › open Android
› Press w › open web
› Press i › open iOS simulator
› Press j › open Expo DevTools
› Press r › reload app
› Press m › toggle menu
› Press o › open project code in your editor
? Press Enter › show more
```

**Chọn platform:**

**A. Web Browser (Nhanh nhất để test)**
```
Nhấn: w
```

**B. Android Emulator**
```
Nhấn: a
# Hoặc: npm run android
```

**C. iOS Simulator (macOS only)**
```
Nhấn: i
# Hoặc: npm run ios
```

**D. Physical Device (với Expo Go app)**
```
Nhấn: w → scan QR code bằng Expo Go
```

---

## 👥 Hướng dẫn Team

### Quy trình Setup cho thành viên mới

**Member mới sẽ:**

1. Clone project
```bash
git clone <url>
cd "New folder"
```

2. Setup Backend
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# ✏️ Edit .env - thêm Adafruit credentials
```

3. Setup Mobile
```bash
cd mobile
npm install
copy .env.local.example .env.local
# ✏️ Edit .env.local - thêm IP backend
cd ..
```

4. Chạy project
```bash
# Terminal 1: Backend
.\venv\Scripts\Activate.ps1
python app.py

# Terminal 2: Mobile (mở terminal mới)
cd mobile
npm start
```

### Troubleshooting cho Team

**Q: "Cannot find module 'requests'"**
```bash
pip install -r requirements.txt
python app.py
```

**Q: "EXPO_PUBLIC_API_URL is undefined"**
```bash
# Kiểm tra .env.local tồn tại
cd mobile
cat .env.local
# Nếu không tồn tại:
copy .env.local.example .env.local
```

**Q: "Port 8000 already in use"**
```bash
# Đóng các process cũ:
# Windows: Ctrl+C trong terminal
# Hoặc: netstat -ano | findstr :8000
```

**Q: "Mobile không kết nối được Backend"**
- Kiểm tra Backend chạy: `http://localhost:8000/api/health`
- Kiểm tra IP trong `.env.local` đúng
- Kiểm tra WiFi: cùng network

---

## ✅ Kiểm tra & Testing

### 1. Backend Health Check

```bash
# Test health
curl http://localhost:8000/api/health

# Test get houses
curl http://localhost:8000/api/houses

# Test get devices
curl http://localhost:8000/api/devices/status
```

### 2. Mobile Login

**Test user:**
- Username: `bach`
- Password: `password123`

### 3. Device Control Test

1. Login vào mobile app
2. Vào DashboardScreen (Home)
3. Chọn một house
4. Chọn một room
5. Kiểm tra devices appear
6. Test control device (on/off, slider)

### 4. Real-time Sync Test

1. Mở app trên 2 thiết bị (hoặc 2 browser tabs)
2. Một thiết bị thay đổi device status
3. Thiết bị kia sẽ tự động cập nhật (real-time)

### 5. MQTT/Adafruit Test

Kiểm tra cấu hình Adafruit:
1. Truy cập: https://io.adafruit.com/feeds
2. Kiểm tra feeds xuất hiện
3. Backend sẽ tự động subscribe

---

## 📊 Tóm tắt Command

| Mục đích | Command |
|---------|---------|
| Kích hoạt venv | `.\venv\Scripts\Activate.ps1` |
| Cài dependencies | `pip install -r requirements.txt` |
| Chạy Backend | `python app.py` |
| Chạy Mobile | `cd mobile && npm start` |
| Test API | `curl http://localhost:8000/api/health` |
| Clean npm cache | `npm cache clean --force` |
| Reinstall mobile | `cd mobile && rm -rf node_modules && npm install` |

---

## 🆘 Cần Trợ Giúp?

- 📖 Chi tiết kiến trúc: Xem `PROJECT_COMPREHENSIVE_SUMMARY.md`
- 🗂️ Cấu trúc project: Xem folder structure trong README.md
- 🔌 API endpoints: Xem `PROJECT_COMPREHENSIVE_SUMMARY.md` phần API

---

**Prepared by:** Smart Home Team  
**Last Updated:** May 9, 2026
