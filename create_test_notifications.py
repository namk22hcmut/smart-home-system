#!/usr/bin/env python
import sqlite3
from datetime import datetime, timedelta

db = sqlite3.connect('instance/smarthome.db')
cursor = db.cursor()

# Clear old
cursor.execute("DELETE FROM notification")
db.commit()

# Diverse notifications
notifications = [
    (1, 'Light Turned On', 'Main Light in Living Room was turned on manually', 'device_change', 1, 0, (datetime.utcnow() - timedelta(minutes=10)).isoformat()),
    (1, 'Temperature Alert', 'Living Room temperature exceeded 28°C', 'threshold_alert', 5, 0, (datetime.utcnow() - timedelta(minutes=9)).isoformat()),
    (1, 'Automation Triggered', 'Auto-AC: Temperature control rule executed', 'automation_trigger', 4, 0, (datetime.utcnow() - timedelta(minutes=8)).isoformat()),
    (1, 'Motion Detected', 'Motion detected in Bedroom at 2:45 PM', 'device_change', 8, 1, (datetime.utcnow() - timedelta(minutes=7)).isoformat()),
    (1, 'Humidity High', 'Bedroom humidity at 85% - above threshold', 'threshold_alert', 6, 0, (datetime.utcnow() - timedelta(minutes=6)).isoformat()),
    (1, 'Device Offline', 'Smart Plug in Kitchen went offline', 'device_change', 3, 1, (datetime.utcnow() - timedelta(minutes=5)).isoformat()),
    (1, 'Schedule Executed', 'Evening routine automation started', 'automation_trigger', 2, 0, (datetime.utcnow() - timedelta(minutes=4)).isoformat()),
    (1, 'Light Dimmed', 'Living Room light adjusted to 30% brightness', 'device_change', 1, 0, (datetime.utcnow() - timedelta(minutes=3)).isoformat()),
    (1, 'Door Unlocked', 'Front door was unlocked at 3:00 PM', 'device_change', 9, 1, (datetime.utcnow() - timedelta(minutes=2)).isoformat()),
    (1, 'Temperature Normal', 'Temperature returned to normal range', 'threshold_alert', 5, 1, (datetime.utcnow() - timedelta(minutes=1)).isoformat()),
]

cursor.executemany(
    "INSERT INTO notification (user_id, title, message, notification_type, device_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    notifications
)
db.commit()
print(f"✅ Created {len(notifications)} diverse notifications")

# Verify
count = cursor.execute("SELECT COUNT(*) FROM notification").fetchone()[0]
print(f"✅ Total notifications: {count}")

# Show samples
print("\n📋 Sample notifications:")
cursor.execute("SELECT notification_id, title, notification_type, is_read FROM notification LIMIT 5")
for row in cursor.fetchall():
    print(f"  - ID {row[0]}: {row[1]} ({row[2]}) | Read: {row[3]}")

db.close()
