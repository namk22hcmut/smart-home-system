import sqlite3
from datetime import datetime
import sys
conn=sqlite3.connect('instance/smarthome.db')
c=conn.cursor()
if len(sys.argv)>1:
    device_id=int(sys.argv[1])
else:
    device_id=2
print('Logs for device',device_id)
for row in c.execute("SELECT log_id, device_id, action, old_status, new_status, new_level, triggered_by, timestamp FROM device_activity_log WHERE device_id=? ORDER BY timestamp DESC LIMIT 50",(device_id,)):
    print(row)
conn.close()
