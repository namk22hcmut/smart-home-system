# 👥 Hướng dẫn Setup cho Thành viên Team

**Mục đích:** Hướng dẫn từng thành viên setup project với .env config của họ  
**Ngày:** April 20, 2026

---

## 📋 Quy trình Clone & Setup (Lần đầu)

### Bước 1: Clone Repository
```bash
git clone <repository-url>
cd "New folder"
```

### Bước 2: Setup Backend (Python)

```bash
# Tạo virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Cài dependencies
pip install -r requirements.txt

# Copy template .env
copy .env.example .env

# ✏️ EDIT .env - Thêm Adafruit credentials của bạn
# Mở file .env và chỉnh sửa:
# ADAFRUIT_USERNAME=your-username
# ADAFRUIT_KEY=your-api-key
```

**Cách lấy Adafruit credentials:**
1. Truy cập: https://io.adafruit.com/settings/keys
2. Copy **Username** 
3. Copy **Active Key**
4. Paste vào `.env` file

### Bước 3: Setup Mobile (React Native)

```bash
cd mobile

# Cài npm dependencies
npm install

# Copy template .env.local
copy .env.local.example .env.local

# ✏️ EDIT .env.local - Thêm IP của backend
# Mở file .env.local và chỉnh sửa:
# EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_IP:8000/api
```

**Cách tìm IP Backend:**

**Cách 1: Backend chạy trên máy bạn**
```bash
# Terminal/PowerShell:
ipconfig

# Tìm "IPv4 Address" - ví dụ: 192.168.1.100
# Hoặc: 10.0.106.239
```

**Cách 2: Backend chạy trên máy khác**
```bash
# Hỏi người chạy backend IP của họ
# Ví dụ: "Backend của bạn chạy trên IP nào?"
```

### Bước 4: Chạy Backend

```bash
cd "New folder"
.\venv\Scripts\Activate.ps1
python app.py

# Output:
# ✅ Running on http://127.0.0.1:8000
# ✅ Running on http://YOUR_IP:8000
```

### Bước 5: Chạy Mobile (Terminal mới)

```bash
cd "New folder\mobile"
npm start

# Chọn:
# w - Web browser
# a - Android emulator
# i - iOS simulator
```

### Bước 6: Login & Test

- Mở app → Login: `bach` / `password123`
- Xem Dashboard
- Chọn Devices tab
- Thử điều khiển device (adjust slider)

---

## 📂 Files Cấu hình

| File | Commit? | Purpose |
|------|---------|---------|
| `.env.example` | ✅ Yes | Template (backend) |
| `.env` | ❌ No (gitignore) | Credentials (backend) |
| `mobile/.env.local.example` | ✅ Yes | Template (mobile) |
| `mobile/.env.local` | ❌ No (gitignore) | Config (mobile) |

---

## ⚠️ Quan trọng - Không Commit!

**KHÔNG COMMIT những files này:**
```
.env                    # Chứa API keys, credentials
mobile/.env.local      # Chứa IP config
```

**Kiểm tra trước commit:**
```bash
git status

# ✅ Không nên thấy:
#   - .env
#   - mobile/.env.local
#   - instance/
```

---

## 🧪 Troubleshooting

### ❌ Backend Error: Missing Adafruit

```
ERROR: Missing Adafruit credentials!
```

**Fix:**
- Kiểm tra `.env` file có tồn tại không
- Thêm `ADAFRUIT_USERNAME` và `ADAFRUIT_KEY`
- Restart backend: `python app.py`

### ❌ Mobile Error: Network Error

```
ERROR: Network Error
```

**Fix:**
1. Kiểm tra `.env.local` có tồn tại không
2. Kiểm tra `EXPO_PUBLIC_API_URL` có đúng IP không
3. Kiểm tra Backend có chạy không: `http://IP:8000/api/health`
4. Restart Expo: `Ctrl+C`, rồi `npm start`

### ❌ Backend Port 8000 bị dùng

```
OSError: [Errno 10048] Only one usage of each socket address
```

**Fix:**
```bash
# Tìm process sử dụng port 8000
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <PID> /F
```

---

## 🎯 Test Checklist

### Backend
- [ ] Virtual environment activated
- [ ] Dependencies installed
- [ ] `.env` file có Adafruit keys
- [ ] Backend chạy: `http://YOUR_IP:8000`
- [ ] Health check: `http://YOUR_IP:8000/api/health` → 200 OK

### Mobile
- [ ] npm install success
- [ ] `.env.local` file exist
- [ ] `EXPO_PUBLIC_API_URL` = đúng IP
- [ ] Expo start
- [ ] App load ✅
- [ ] Login success ✅
- [ ] Dashboard load ✅
- [ ] Devices visible ✅

---

## 💬 FAQ

**Q: Mỗi dev phải tạo `.env` riêng không?**
A: Có, mỗi dev tạo file `.env` của riêng mình (git sẽ ignore)

**Q: Làm sao mà `.env.example` có mặt trên GitHub?**
A: `.env.example` là template chứ không phải credentials thực, an toàn để commit

**Q: Khi nào xài development vs production?**
A: Development ngay (FLASK_ENV=development). Production sau khi deploy lên server

**Q: Thay đổi .env phải restart backend không?**
A: Có, cần restart backend

**Q: IP của backend thay đổi làm sao?**
A: Update lại `.env.local` với IP mới, rồi reload Expo

---

## 📞 Support

Nếu có lỗi:
1. Xem **Troubleshooting** section
2. Kiểm tra logs (Backend + Mobile)
3. Hỏi trong team chat

---

## 🎉 Success!

Khi tất cả các test pass → Ready để làm việc! ✅

---

**Chúc các thành viên setup thành công!** 🚀
