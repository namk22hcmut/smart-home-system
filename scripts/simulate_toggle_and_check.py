import os
import sys
sys.path.insert(0, os.getcwd())
from app import app, generate_token
from models import User, Device, DeviceActivityLog
from datetime import datetime

print('Simulate toggle device and check updated_at + logs')
with app.app_context():
    user = User.query.first()
    if not user:
        print('No user')
        sys.exit(1)
    token = generate_token(user.user_id, user.username)
    client = app.test_client()
    device_id = 2
    status_to_set = sys.argv[1] if len(sys.argv) > 1 else 'on'
    print(f'PUT /api/devices/{device_id} -> {status_to_set}')
    resp = client.put(f'/api/devices/{device_id}', json={'status': status_to_set}, headers={'Authorization': f'Bearer {token}'})
    print('Status:', resp.status_code)
    print('Response JSON:', resp.get_json())

    # check device row
    dev = Device.query.get(device_id)
    print('Device row:', dev.device_id, dev.device_name, dev.status, dev.updated_at)

    # latest activity
    log = DeviceActivityLog.query.filter(DeviceActivityLog.device_id==device_id).order_by(DeviceActivityLog.timestamp.desc()).first()
    if log:
        print('Latest log:', log.log_id, log.action, log.old_status, log.new_status, log.new_level, log.timestamp)
    else:
        print('No logs found')

    # call usage endpoint
    resp2 = client.get(f'/api/houses/1/device-usage?period=today', headers={'Authorization': f'Bearer {token}'})
    print('Usage status:', resp2.status_code)
    data = resp2.get_json()
    if data and data.get('success'):
        devs = {d['device_id']: d for d in data.get('devices', [])}
        if device_id in devs:
            d = devs[device_id]
            print('Usage for device:', d)
        else:
            print('Device not in usage response')
    else:
        print('Usage API returned error', data)
