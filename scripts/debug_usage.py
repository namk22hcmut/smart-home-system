import sqlite3
from datetime import datetime, timedelta
import sys

DB = 'instance/smarthome.db'

def parse_dt(s):
    try:
        return datetime.fromisoformat(s)
    except Exception:
        try:
            return datetime.strptime(s, '%Y-%m-%d %H:%M:%S.%f')
        except Exception:
            return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')


def load_device(conn, device_id):
    c = conn.cursor()
    row = c.execute('SELECT device_id, device_name, device_type, status, level, updated_at FROM device WHERE device_id=?', (device_id,)).fetchone()
    if not row:
        return None
    return {
        'device_id': row[0], 'device_name': row[1], 'device_type': row[2], 'status': row[3], 'level': row[4], 'updated_at': parse_dt(row[5]) if row[5] else None
    }


def get_last_before(conn, device_id, start_date):
    c = conn.cursor()
    row = c.execute("SELECT log_id, action, old_status, new_status, new_level, timestamp FROM device_activity_log WHERE device_id=? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1", (device_id, start_date)).fetchone()
    return row


def get_activities(conn, device_id, start_date):
    c = conn.cursor()
    rows = c.execute("SELECT log_id, action, old_status, new_status, new_level, timestamp FROM device_activity_log WHERE device_id=? AND timestamp >= ? ORDER BY timestamp", (device_id, start_date)).fetchall()
    return rows


def is_on_event(row):
    action = row[1]
    new_status = row[3]
    new_level = row[4]
    try:
        if str(new_status).lower() == 'on':
            return True
    except Exception:
        pass
    if action == 'set_level' and new_level is not None and int(new_level) > 0:
        return True
    return False


def is_off_event(row):
    action = row[1]
    new_status = row[3]
    new_level = row[4]
    try:
        if str(new_status).lower() == 'off':
            return True
    except Exception:
        pass
    if action == 'set_level' and new_level is not None and int(new_level) == 0:
        return True
    if action in ('turn_off', 'schedule_auto_off'):
        return True
    return False


def compute_usage(device, last_before, activities, start_date, now):
    total_minutes = 0.0
    initial_on = True if (last_before and (is_on_event(last_before))) else False
    current_on = initial_on
    turn_on_time = start_date if initial_on else None

    print(f"initial_on={initial_on}, turn_on_time={turn_on_time}")

    for row in activities:
        ts = parse_dt(row[5])
        on = is_on_event(row)
        off = is_off_event(row)
        print(f"evt {row[0]} {row[1]} new_status={row[3]} new_level={row[4]} ts={ts} on={on} off={off}")

        if off and not current_on and initial_on:
            start_point = start_date
            if last_before and last_before[5]:
                try:
                    lb_ts = parse_dt(last_before[5])
                    start_point = max(start_date, lb_ts)
                except Exception:
                    pass
            duration = (ts - start_point).total_seconds()/60.0
            print(f" closing initial-on interval from {start_point} to {ts} => {duration} min")
            total_minutes += max(0.0, duration)
            initial_on = False
            continue

        if on and not current_on:
            current_on = True
            turn_on_time = ts
            print(f" set current_on True at {turn_on_time}")
        elif off and current_on:
            duration = (ts - turn_on_time).total_seconds()/60.0
            print(f" closing interval {turn_on_time} -> {ts} => {duration} min")
            total_minutes += max(0.0, duration)
            current_on = False
            turn_on_time = None

    # account for running interval if device.status == 'on'
    if device['status'] == 'on':
        if current_on and turn_on_time:
            duration = (now - turn_on_time).total_seconds() / 60.0
            print(f"account running {turn_on_time} -> {now} => {duration} min")
            total_minutes += max(0.0, duration)
        else:
            on_times = [parse_dt(r[5]) for r in activities if is_on_event(r)]
            if on_times:
                last_on = max(on_times)
                duration = (now - last_on).total_seconds()/60.0
                print(f"no current_on; use last_on {last_on} -> {now} => {duration} min")
                total_minutes += max(0.0, duration)

    return total_minutes


def main():
    device_id = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    conn = sqlite3.connect(DB)
    now = datetime.utcnow()
    start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # Use DB-friendly datetime string format (space between date and time)
    start_date_str = start_date.strftime('%Y-%m-%d %H:%M:%S')

    device = load_device(conn, device_id)
    if not device:
        print('device not found')
        return
    print('device:', device)

    last_before = get_last_before(conn, device_id, start_date_str)
    print('last_before:', last_before)

    activities = get_activities(conn, device_id, start_date_str)
    print(f'activities_count={len(activities)}')

    total_minutes = compute_usage(device, last_before, activities, start_date, now)
    print(f'TOTAL minutes = {total_minutes}, hours={total_minutes/60.0}')
    conn.close()

if __name__ == '__main__':
    main()
