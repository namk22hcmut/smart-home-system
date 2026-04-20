# 🔧 Environment Configuration Guide

**Giải pháp cho:** API tĩnh → API động theo môi trường  
**Ngày cập nhật:** April 20, 2026

---

## 📝 Tổng quan

Dự án đã được cấu hình để hỗ trợ:
- ✅ **Cấu hình linh hoạt** qua `.env` file
- ✅ **An toàn GitHub** - thông tin nhạy cảm không được commit
- ✅ **Đa môi trường** - development, staging, production
- ✅ **Đa mạng** - localhost, LAN, emulator

---

## 🚀 Bước 1: Tạo `.env` file cho Backend

### Vị trí
```
c:\Users\namkz\Desktop\dacn\dadn\New folder\.env
```

### Nội dung (copy từ `.env.example`)
```env
# Flask Environment
FLASK_ENV=development

# Database
DATABASE_URL=sqlite:///smarthome.db

# Security Keys (CHANGE IN PRODUCTION!)
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET=your-jwt-secret-key-here-change-in-production

# Adafruit IoT Configuration (REQUIRED!)
ADAFRUIT_USERNAME=your-adafruit-username
ADAFRUIT_KEY=your-adafruit-api-key

# Backend API URL
BACKEND_API_URL=http://localhost:8000
```

### Cách lấy Adafruit Credentials
1. Truy cập: https://io.adafruit.com/settings/keys
2. Copy **Username**
3. Copy **Active Key**
4. Paste vào `.env` file

---

## 📱 Bước 2: Tạo `.env.local` file cho Mobile App

### Vị trí
```
c:\Users\namkz\Desktop\dacn\dadn\New folder\mobile\.env.local
```

### Cấu hình theo tình huống

**A. Chạy trên máy tính (localhost)**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

**B. Chạy trên thiết bị vật lý (cùng mạng LAN)**
```env
# Thay YOUR_COMPUTER_IP bằng IP của máy chạy backend
# VD: 192.168.1.100, 10.0.0.5, v.v...
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000/api
```

**C. Android Emulator**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

**D. iOS Simulator**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

### Cách tìm IP của máy backend (Windows)
```powershell
# Terminal: cmd hoặc PowerShell
ipconfig

# Tìm "IPv4 Address" dòng Wireless LAN adapter hoặc Ethernet
# VD: 192.168.1.100
```

---

## ✅ Kiểm tra Cấu hình

### Backend
```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder"
.\venv\Scripts\Activate.ps1
python app.py
```

Nếu thiếu credentials sẽ báo:
```
❌ Missing Adafruit credentials!
Please set ADAFRUIT_USERNAME and ADAFRUIT_KEY in .env file
```

### Mobile
```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder\mobile"
npm install  # Nếu chưa install
npx expo start
```

Chọn platform: `w` (web), `a` (android), `i` (ios)

---

## 🔄 Các thành viên nhóm làm gì?

### Lần đầu clone repository
```bash
git clone <repository-url>
cd "New folder"

# Backend setup
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy .env.example → .env
copy .env.example .env
# ✏️ Edit .env: thêm Adafruit credentials

# Mobile setup
cd mobile
npm install
# ✏️ Edit .env.local: thêm API URL phù hợp
```

### Lần sau pull code
```bash
git pull origin main
# Không cần setup lại .env và .env.local (chúng được .gitignore)
```

---

## 🛡️ Bảo mật - Quan trọng!

### ❌ KHÔNG commit những files này
```
.env                  # Backend configuration
mobile/.env.local    # Mobile configuration
.env.*.local         # Any other env files
instance/            # Database files
__pycache__/         # Python cache
node_modules/        # NPM packages
```

### ✅ Những files nên commit
```
.env.example         # Template cho team
.gitignore          # Protect sensitive files
app.config.js       # Expo configuration
config.py           # App configuration logic
```

---

## 🐛 Troubleshooting

### Backend không kết nối Adafruit
```
❌ Error: ADAFRUIT_USERNAME or ADAFRUIT_KEY not set
```
**Giải pháp**: Kiểm tra `.env` file có `ADAFRUIT_USERNAME` và `ADAFRUIT_KEY` không

### Mobile không kết nối Backend
```
❌ Network Error: connect ECONNREFUSED
```
**Giải pháp**:
1. Kiểm tra Backend có chạy trên cổng 8000: `http://localhost:8000`
2. Kiểm tra `.env.local` có API URL đúng không
3. Nếu trên thiết bị vật lý: kiểm tra IP address có đúng không

### Expo báo lỗi environment variables
```
❌ Cannot read property 'expoConfig' of undefined
```
**Giải pháp**:
1. Chạy: `npx expo start` (reset Expo cache)
2. Hoặc: `npm install dotenv` trong folder mobile

---

## 📚 Tham khảo

- **Adafruit Docs**: https://io.adafruit.com/api/docs/
- **Expo Environment Variables**: https://docs.expo.dev/build/variables/
- **Python dotenv**: https://python-dotenv.readthedocs.io/

---

## 💬 Câu hỏi thường gặp

**Q: Tại sao phải tạo `.env` file?**  
A: Để không lộ thông tin nhạy cảm (API keys, passwords) trên GitHub

**Q: Mỗi dev cần `.env` riêng không?**  
A: Có, mỗi dev tạo file `.env` và `.env.local` của riêng mình (git sẽ ignore)

**Q: Khi nào xài development vs production config?**  
A: 
- Development: Khi đang code, test local
- Production: Khi deploy lên server thực

**Q: API URL tại sao khác nhau trên web vs mobile?**  
A: Mobile và web chạy trên process khác nhau, nên IP special khác nhau

---

## 🎯 Next Steps

1. ✅ Tạo `.env` file (backend)
2. ✅ Tạo `.env.local` file (mobile)  
3. ✅ Start backend API: `python app.py`
4. ✅ Start mobile app: `npx expo start`
5. ✅ Test kết nối API
6. ✅ Push code lên GitHub (`.env` và `.env.local` sẽ bị ignore)
