from app import app
from models import Schedule
import datetime

with app.app_context():
    # Get the latest schedule
    latest = Schedule.query.order_by(Schedule.schedule_id.desc()).first()
    if latest:
        print(f"Latest schedule: ID={latest.schedule_id}")
        print(f"  Time: {latest.scheduled_time}")
        print(f"  Active: {latest.is_active}")
        print(f"  Last triggered: {latest.last_triggered_at}")
        
        now = datetime.datetime.now()
        if latest.last_triggered_at:
            print(f"✅ TRIGGERED! Diff from now: {(now - latest.last_triggered_at).total_seconds():.1f} seconds ago")
        else:
            print(f"❌ NOT triggered yet")
    else:
        print("No schedules found")
