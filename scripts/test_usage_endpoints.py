import os
import sys
import json
# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, generate_token
from models import User, House

with app.app_context():
    user = User.query.first()
    if not user:
        print('No users in DB')
        raise SystemExit(1)

    token = generate_token(user.user_id, user.username)
    client = app.test_client()

    headers = {'Authorization': f'Bearer {token}'}

    print('Legacy route availability:')
    print('  device-usage-day:', any(str(r) == '/api/devices/<int:device_id>/usage-day' for r in app.url_map.iter_rules()))
    print('  house-device-usage-day:', any(str(r) == '/api/houses/<int:house_id>/device-usage-day' for r in app.url_map.iter_rules()))

    house = House.query.first()
    if not house:
        print('No house found')
        raise SystemExit(0)

    response = client.get(
        f'/api/houses/{house.house_id}/device-usage?period=today',
        headers=headers,
    )

    print('\nHOUSE DEVICE USAGE RESPONSE:')
    print(response.status_code)
    try:
        print(json.dumps(response.get_json(), indent=2, default=str))
    except Exception:
        print(response.get_data(as_text=True))
