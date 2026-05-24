import sqlite3
import sys
from datetime import datetime

DB = 'instance/smarthome.db'

def row_to_str(r):
    if not r: return ''
    action = (r['action'] or '')
    old_status = (r['old_status'] or '')
    new_status = (r['new_status'] or '')
    old_level = '' if r['old_level'] is None else str(r['old_level'])
    new_level = '' if r['new_level'] is None else str(r['new_level'])
    triggered = (r['triggered_by'] or '')
    ts = (r['timestamp'] or '')
    return f"{r['log_id']:5} | dev:{r['device_id']:3} | action:{action[:12]:12} | old:{old_status:3} -> new:{new_status:3} | lvl:{old_level}->{new_level} | trig:{triggered[:8]:8} | {ts}"

if __name__ == '__main__':
    device_arg = None
    if len(sys.argv) > 1:
        try:
            device_arg = int(sys.argv[1])
        except Exception:
            device_arg = None

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    q = 'SELECT log_id, device_id, action, old_status, new_status, old_level, new_level, triggered_by, timestamp FROM device_activity_log'
    params = []
    if device_arg:
        q += ' WHERE device_id = ?'
        params.append(device_arg)
    q += ' ORDER BY timestamp DESC LIMIT 100'
    cur.execute(q, params)
    rows = cur.fetchall()
    print(f"Showing {len(rows)} rows from {DB} (most recent first)\n")
    for r in rows:
        print(row_to_str(r))
    conn.close()
