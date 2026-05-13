# Database Scripts Helper

## 📂 Các Database Scripts Có Sẵn

Tất cả scripts được đặt trong thư mục `scripts/`:

### 1. **init_db.py** - Khởi tạo Database
Tạo tất cả 20 bảng từ models.py

```bash
# Chạy từ root folder:
python scripts/init_db.py

# Hoặc từ scripts folder:
cd scripts
python init_db.py
```

**Output mong đợi:**
```
✅ Database initialized
🔄 Initializing database schema...
✅ Database schema initialized successfully!

📋 Tables created (20 total):
   ✓ user
   ✓ house
   ✓ floor
   ✓ room
   ✓ device
   ✓ sensor
   ✓ schedule
   ... và 13 table khác
```

---

### 2. **add_auto_off_tracking.py** - Thêm Auto-Off Column
Thêm cột `auto_off_at` vào bảng schedule (dùng sau khi update models)

```bash
python scripts/add_auto_off_tracking.py
```

**Output mong đợi:**
```
📁 Database: instance/smarthome.db

📋 Existing columns: {...}

🔄 Adding auto_off_at column...
   ✓ Added auto_off_at column

✅ Database schema update complete!
```

---

### 3. **seed_database.py** - Seed Test Data
Thêm dữ liệu test: users, houses, devices, sensors, schedules

```bash
python scripts/seed_database.py
```

**Output mong đợi:**
```
🌱 Seeding database with test data...
✓ Created 1 test user: bach
✓ Created 2 houses
✓ Created 5 floors
✓ Created 10 rooms
✓ Created 20 devices
✓ Created 25 sensors
✓ Created 10 schedules
...
✅ Database seeding complete!
```

---

## 🚀 Quick Setup (First Time)

Chạy lần lượt các scripts này:

```bash
# 1. Khởi tạo database (tạo tất cả tables)
python scripts/init_db.py

# 2. Thêm auto-off column (nếu chưa có)
python scripts/add_auto_off_tracking.py

# 3. Seed test data (để test mobile app)
python scripts/seed_database.py

# 4. Chạy backend
python app.py
```

---

## 📝 Notes

- **Database location:** `instance/smarthome.db`
- **Chạy từ root folder:** `python scripts/init_db.py`
- **Chạy từ scripts folder:** 
  ```bash
  cd scripts
  python init_db.py
  ```
- **Xóa database cũ (nếu cần):**
  ```bash
  Remove-Item instance/smarthome.db -Force
  ```

---

## ✅ Verification

Sau khi chạy scripts, kiểm tra:

```bash
# Check database exists
Test-Path instance/smarthome.db

# Check database size
Get-Item instance/smarthome.db | Select-Object Length
```

---

## 🔗 Related Files

- Backend app: `app.py`
- Database models: `models.py`
- Config: `config.py`
- Documentation: `docs/SETUP.md`
