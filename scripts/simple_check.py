#!/usr/bin/env python
"""Check activity logs in database"""
import sqlite3
from datetime import datetime

db_path = 'instance/smarthome.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("[ACTIVITY LOG CHECK]")
print("=" * 60)

# Get activity logs from today
today = datetime.now().strftime('%Y-%m-%d')
cursor.execute(f'''
  SELECT log_id, device_id, action, old_status, new_status, triggered_by, timestamp
  FROM device_activity_log
  WHERE timestamp >= '{today}'
  ORDER BY timestamp DESC
  LIMIT 20
''')

logs = cursor.fetchall()
print(f"\nActivity logs created today: {len(logs)}")

if logs:
    print("\nRecent activity logs:")
    for log_id, dev_id, action, old_st, new_st, trig, ts in logs:
        print(f"  [{ts}] Device {dev_id:2d}: {action:12s} ({old_st:3s} -> {new_st:3s}) by {trig}")
else:
    print("\nNo activity logs found today")

# Total count
cursor.execute("SELECT COUNT(*) FROM device_activity_log")
total = cursor.fetchone()[0]
print(f"\nTotal activity logs in database: {total}")

conn.close()
