from app import app
from models import Schedule, Device
import datetime

with app.app_context():
    schedules = Schedule.query.all()
    print(f"Total schedules: {len(schedules)}\n")
    
    if len(schedules) == 0:
        print("❌ No schedules found in database!")
    else:
        for s in schedules:
            device = Device.query.get(s.device_id)
            device_name = device.device_name if device else "Unknown"
            today = datetime.datetime.now().weekday()
            iso_day = (today + 1) % 7  # Convert Python weekday to app-day (0=Sunday)
            days_list = [int(d) for d in s.days_of_week.split(',')] if s.days_of_week else []
            today_in_schedule = iso_day in days_list
            
            print(f"Schedule ID={s.schedule_id}")
            print(f"  Device: {device_name} (ID={s.device_id})")
            print(f"  Time: {s.scheduled_time}")
            print(f"  Days: {s.days_of_week} (today={iso_day}, included={today_in_schedule})")
            print(f"  Active: {s.is_active}")
            print(f"  Action: {s.action_status} (level={s.action_level})")
            print(f"  Duration: {s.duration_minutes} minutes")
            print(f"  Last triggered: {s.last_triggered_at}")
            print(f"  Auto-off at: {s.auto_off_at}")
            print()
