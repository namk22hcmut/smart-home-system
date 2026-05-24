from app import app
from models import Schedule, db
import datetime
import sys

with app.app_context():
    schedule_id = input("Nhập Schedule ID để reset: ").strip()
    new_time = input("Nhập thời gian mới (HH:MM, vd: 16:20): ").strip()
    
    try:
        schedule = Schedule.query.get(int(schedule_id))
        if not schedule:
            print(f"❌ Schedule ID={schedule_id} không tìm thấy")
            sys.exit(1)
        
        # Parse time
        hours, minutes = map(int, new_time.split(':'))
        new_time_obj = datetime.time(hours, minutes)
        
        # Update
        old_time = schedule.scheduled_time
        schedule.scheduled_time = new_time_obj
        schedule.last_triggered_at = None  # Reset để có thể trigger lại hôm nay
        db.session.commit()
        
        print(f"✅ Schedule ID={schedule_id} updated!")
        print(f"   {old_time} → {new_time_obj}")
        print(f"   last_triggered_at reset → None")
        print(f"⏱️  Sẽ trigger lúc {new_time_obj}")
        
    except ValueError as e:
        print(f"❌ Lỗi: {e}")
        print("   Format thời gian phải là HH:MM (vd: 16:25)")
