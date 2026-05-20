from app import app
from models import Schedule, db

with app.app_context():
    # Reset last_triggered_at for schedule ID=10 so it can run again today
    schedule = Schedule.query.get(10)
    if schedule:
        print(f"Before: {schedule.schedule_id} - last_triggered_at = {schedule.last_triggered_at}")
        schedule.last_triggered_at = None
        db.session.commit()
        print(f"After: {schedule.schedule_id} - last_triggered_at = {schedule.last_triggered_at}")
        print("✅ Schedule reset — will trigger again when time matches!")
    else:
        print("❌ Schedule not found")
