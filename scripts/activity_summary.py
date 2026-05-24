import sqlite3
from datetime import datetime
import sys
conn=sqlite3.connect('instance/smarthome.db')
c=conn.cursor()
if len(sys.argv)>1:
    device_id=int(sys.argv[1])
else:
    device_id=2
today = datetime.now().strftime('%Y-%m-%d')
q = f"SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM device_activity_log WHERE device_id=? AND timestamp >= '{today}'"
print('Query:', q)
res = c.execute(q,(device_id,)).fetchone()
print('Result:', res)
print('\nDetailed events:')
for row in c.execute("SELECT timestamp, action, old_status, new_status, new_level FROM device_activity_log WHERE device_id=? AND timestamp >= ? ORDER BY timestamp",(device_id,today)):
    print(row)
conn.close()
