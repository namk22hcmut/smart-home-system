#!/usr/bin/env python
"""Test device usage calculation endpoint"""
import os
import sys
sys.path.insert(0, os.getcwd())

from app import app, generate_token
from models import User

print("[DEVICE USAGE CALCULATION TEST]")
print("=" * 60)

# Generate token
with app.app_context():
    user = User.query.first()
    if user:
        token = generate_token(user.user_id, user.username)
        print(f"Token generated for: {user.username}")
    else:
        print("ERROR: No user found")
        sys.exit(1)

# Test device usage endpoint
with app.test_client() as client:
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\n[1] Testing GET /api/houses/1/device-usage?period=today")
    response = client.get(
        '/api/houses/1/device-usage?period=today',
        headers=headers
    )
    
    print(f"    Status: {response.status_code}")
    data = response.get_json()
    
    if data and data.get('success'):
        print(f"    Success: True")
        print(f"    Devices in response: {len(data.get('devices', []))}")
        
        devices = data.get('devices', [])
        if devices:
            print(f"\n[2] Device usage details:")
            for dev in devices[:5]:  # Show first 5
                print(f"\n    Device: {dev.get('device_name')} (ID: {dev.get('device_id')})")
                print(f"    Status: {dev.get('status')}")
                print(f"    Usage: {dev.get('usage_display')}")
                print(f"    Minutes: {dev.get('usage_minutes')}")
                print(f"    Hours: {dev.get('usage_hours')}")
        else:
            print("    No devices in response")
    else:
        print(f"    Error: {data}")
        print(f"    Full response: {response.data}")

print("\n" + "=" * 60)
