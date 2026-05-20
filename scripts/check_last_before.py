import sqlite3
from datetime import datetime, timedelta
conn=sqlite3.connect('instance/smarthome.db')
c=conn.cursor()
device_id=2
now = datetime.utcnow()
start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
print('UTC now', now)
print('start_date', start_date)
row = c.execute("SELECT log_id, action, old_status, new_status, new_level, timestamp FROM device_activity_log WHERE device_id=? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1", (device_id, start_date)).fetchone()
print('last_before:', row)
rows_in = c.execute("SELECT log_id, action, old_status, new_status, new_level, timestamp FROM device_activity_log WHERE device_id=? AND timestamp >= ? ORDER BY timestamp", (device_id, start_date)).fetchall()
print('activities today count', len(rows_in))
for r in rows_in[-5:]:
	print('act:', r)
conn.close()
