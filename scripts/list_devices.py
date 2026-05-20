import sqlite3
conn=sqlite3.connect('instance/smarthome.db')
c=conn.cursor()
print('Devices:')
for row in c.execute("SELECT device_id, device_name, status, updated_at FROM device ORDER BY device_id"):
    print(row)
conn.close()
