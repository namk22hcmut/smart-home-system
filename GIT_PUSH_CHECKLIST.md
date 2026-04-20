# 📋 Git Push Checklist - Trước khi Push lên GitHub

**Đảm bảo không lộ thông tin nhạy cảm!**

---

## ✅ Kiểm tra trước Push

### 1. Các file cần commit
```bash
git status
```

Kiểm tra các file này CÓ trong staging:
- ✅ `.env.example`
- ✅ `.gitignore`
- ✅ `config.py`
- ✅ `app.py`
- ✅ `models.py`
- ✅ `mobile/app.config.js`
- ✅ `mobile/src/services/api.js` (updated)
- ✅ `mobile/src/services/auth.js` (updated)
- ✅ `mobile/src/services/realtime.js` (updated)
- ✅ `mobile/src/services/notification_socket.js` (updated)
- ✅ `ENV_SETUP_GUIDE.md`
- ✅ `README_ENV.md`
- ✅ `SOLUTION_SUMMARY.md`

### 2. Các file KHÔNG được commit
```bash
git status
```

Kiểm tra các file này KHÔNG trong staging:
- ❌ `.env` (Backend config)
- ❌ `mobile/.env.local` (Mobile config)
- ❌ `instance/smarthome.db` (Database)
- ❌ `__pycache__/` (Python cache)
- ❌ `venv/` (Virtual environment)
- ❌ `mobile/node_modules/` (NPM packages)

---

## 🚀 Quy trình Push an toàn

### Bước 1: Kiểm tra .gitignore
```bash
# Đảm bảo .env files được ignore
cat .gitignore

# Output nên chứa:
# .env
# .env.local
# .env.*.local
# instance/
# __pycache__/
# node_modules/
```

### Bước 2: Xem files sẽ được commit
```bash
git add .
git status

# Kiểm tra: Không có .env, .env.local, instance/ trong "Changes to be committed"
```

### Bước 3: Kiểm tra nếu .env đã commit (nguy hiểm!)
```bash
git log --all --full-history -- ".env"
git log --all --full-history -- "mobile/.env.local"

# Nếu có output = .env từng bị commit trước
# Cần: git filter-branch (xóa history)
```

### Bước 4: Commit an toàn
```bash
git add .
git commit -m "🔧 feat: Dynamic API configuration with .env support"
```

### Bước 5: Push
```bash
git push origin main

# ✅ Thành công - Project ready trên GitHub!
```

---

## ⚠️ Nếu .env đã bị commit

### Tình huống: .env files đã commit trước đó
```bash
# Kiểm tra
git log --oneline | head -5

# Nếu thấy .env trong commits cũ
# Cần xóa nó khỏi history
```

### Giải pháp: Xóa .env khỏi history (BFG Repo-Cleaner)
```bash
# 1. Install BFG (Windows)
choco install bfg

# 2. Clone repo (fresh)
git clone --mirror https://github.com/user/repo.git repo.git
cd repo.git

# 3. Xóa .env khỏi history
bfg --delete-files .env

# 4. Push lên GitHub
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force origin

# ⚠️ Cảnh báo: Tất cả developers phải re-clone repo
```

### Giải pháp đơn giản hơn: Tạo branch mới
```bash
# 1. Tạo branch mới (sạch)
git checkout --orphan clean-branch

# 2. Commit toàn bộ files (trừ .env)
git add -A
git reset .env
git reset mobile/.env.local
git commit -m "Clean: Remove sensitive files from history"

# 3. Replace main branch
git branch -D main
git branch -m clean-branch main

# 4. Force push
git push -f origin main

# ⚠️ Cảnh báo: Tất cả developers phải re-clone repo
```

---

## ✨ Checklist Cuối cùng

- [ ] `.gitignore` có `.env`, `.env.local`
- [ ] `.env.example` và `.env.local` được commit
- [ ] Không có `.env` file trong staging area
- [ ] `git status` sạch (hoặc chỉ commit files mới)
- [ ] Kiểm tra `git log` không có .env cũ
- [ ] Commit message rõ ràng
- [ ] Test backend: `python app.py` (với `.env`)
- [ ] Test mobile: `npx expo start` (với `.env.local`)
- [ ] Push thành công
- [ ] Kiểm tra GitHub - không thấy `.env` files

---

## 🎉 Sau khi Push

### Thông báo cho Team
```markdown
✅ **Dynamic API Configuration Ready!**

**Các thành viên mới cần:**
1. Clone repo
2. Tạo `.env` file (copy từ `.env.example`)
3. Thêm Adafruit credentials
4. Tạo `mobile/.env.local` 
5. Chạy: python app.py
6. Chạy: npx expo start

Xem: ENV_SETUP_GUIDE.md
```

### Link hướng dẫn
- Detailed: [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- Quick: [README_ENV.md](./README_ENV.md)
- Summary: [SOLUTION_SUMMARY.md](./SOLUTION_SUMMARY.md)

---

## 🆘 Troubleshooting

### Lỗi: Git pushing nhưng .env vẫn upload
```bash
# .env chưa trong .gitignore
# Fix:
echo ".env" >> .gitignore
echo "mobile/.env.local" >> .gitignore
git add .gitignore
git commit -m "fix: add env files to gitignore"
git push
```

### Lỗi: Backend không start
```bash
# .env file chưa tạo hoặc thiếu credentials
# Fix:
copy .env.example .env
# Edit .env: thêm ADAFRUIT_USERNAME, ADAFRUIT_KEY
python app.py
```

### Lỗi: Mobile không connect Backend
```bash
# mobile/.env.local không tạo hoặc API URL sai
# Fix:
copy .env.local .env.local
# Edit EXPO_PUBLIC_API_URL
npx expo start
```

---

**Status: ✅ Ready for GitHub Push!**

**Người thực hiện:** [Your Name]  
**Ngày:** April 20, 2026
