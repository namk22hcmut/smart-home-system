import sqlite3
import sys
from datetime import datetime, timedelta

DB = 'instance/smarthome.db'

def is_on_event(row):
    new_status = (row['new_status'] or '').lower()
    action = (row['action'] or '')
    new_level = row['new_level']
    try:
        lvl = int(new_level) if new_level is not None else None
    except Exception:
        lvl = None
    return (new_status == 'on') or (action == 'set_level' and lvl is not None and lvl > 0)

def is_off_event(row):
    new_status = (row['new_status'] or '').lower()
    action = (row['action'] or '')
    new_level = row['new_level']
    try:
        lvl = int(new_level) if new_level is not None else None
    except Exception:
        lvl = None
    return (new_status == 'off') or (action == 'set_level' and lvl == 0) or (action in ['turn_off', 'schedule_auto_off'])


def compute(device_id, date_str=None, merge_gap=30, min_interval=5):
    if date_str:
        start = datetime.strptime(date_str, '%Y-%m-%d')
    else:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    now = datetime.utcnow()
    if start.date() == now.date():
        end = min(end, now)

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    actions = ['turn_on','turn_off','schedule_executed','schedule_auto_off','set_level','toggle']

    q_last = 'SELECT * FROM device_activity_log WHERE device_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1'
    cur.execute(q_last, (device_id, start))
    last_before = cur.fetchone()

    q_acts = f"SELECT * FROM device_activity_log WHERE device_id = ? AND timestamp >= ? AND timestamp < ? AND action IN ({','.join(['?']*len(actions))}) ORDER BY timestamp"
    params = [device_id, start, end] + actions
    cur.execute(q_acts, params)
    activities = cur.fetchall()

    initial_on = True if (last_before and is_on_event(last_before)) else False
    current_on = initial_on
    turn_on_time = None
    if initial_on:
        try:
            lb_ts = getattr(last_before, 'timestamp', None)
            if lb_ts and lb_ts > start:
                turn_on_time = datetime.fromisoformat(lb_ts)
            else:
                turn_on_time = start
        except Exception:
            turn_on_time = start

    intervals = []
    for act in activities:
        ts = datetime.fromisoformat(act['timestamp'])
        is_on = is_on_event(act)
        is_off = is_off_event(act)
        if is_on:
            if not current_on:
                current_on = True
                turn_on_time = ts
        elif is_off:
            if current_on and turn_on_time:
                intervals.append((turn_on_time, ts))
                current_on = False
                turn_on_time = None

    if current_on and turn_on_time:
        intervals.append((turn_on_time, end))

    # Merge intervals
    merged = []
    for s, e in sorted(intervals, key=lambda x: x[0]):
        if not merged:
            merged.append([s, e])
            continue
        last_s, last_e = merged[-1]
        if s <= (last_e + timedelta(seconds=merge_gap)):
            merged[-1][1] = max(last_e, e)
        else:
            merged.append([s, e])

    total_minutes = 0.0
    filtered = []
    for s, e in merged:
        dur = (e - s).total_seconds()
        if dur >= min_interval:
            total_minutes += dur / 60.0
            filtered.append((s, e, dur/60.0))

    conn.close()
    return total_minutes, filtered


if __name__ == '__main__':
    device = int(sys.argv[1]) if len(sys.argv) > 1 else None
    date_in = sys.argv[2] if len(sys.argv) > 2 else None
    if not device:
        print('Usage: python compute_usage_day.py <device_id> [YYYY-MM-DD]')
        sys.exit(1)
    minutes, intervals = compute(device, date_in)
    print(f"Device {device} usage_minutes={minutes}")
    print('Intervals:')
    for a,b,d in intervals:
        print(f" - {a.isoformat()} -> {b.isoformat()} = {round(d,2)} min")
