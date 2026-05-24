import sqlite3
conn=sqlite3.connect('instance/smarthome.db')
c=conn.cursor()
rows=c.execute("SELECT log_id, action, old_status, new_status, new_level, timestamp, triggered_by FROM device_activity_log WHERE device_id=? ORDER BY timestamp DESC LIMIT 5", (2,)).fetchall()
for r in rows:
    print(r)
conn.close()
