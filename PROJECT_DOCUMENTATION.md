# Project Documentation — Smart Home Device Usage Tracking

**Last updated:** 2026-05-13  
**Version:** 3.3.1 (Post-Cleanup)

> **📝 Note:** Project cleanup completed on 2026-05-13. Six redundant files were safely removed to streamline the project structure. See [PROJECT_CLEANUP_AUDIT.md](./PROJECT_CLEANUP_AUDIT.md) for details.

---

## 1. Executive Summary

This repository implements a smart home backend and mobile app that track device activity and calculate per-device usage time. A bug was fixed where user-driven device controls did not create activity logs, causing the dashboard to show "0h 0m" for usage. The fix ensures every device control creates a `DeviceActivityLog` record, enabling accurate usage calculation and dashboard display.

---

## 2. Problem & Root Cause

- Symptom: Dashboard showed "0h 0m" for all devices even when they were ON.
- Root cause: The `PUT /api/devices` endpoint updated device status but did not create `DeviceActivityLog` entries for user actions, so the usage calculation had no logs to analyze.

---

## 3. Fix Implemented (Backend)

File: `app.py` — Endpoint: `PUT /api/devices/{device_id}`

Change summary:

```
# After updating device.status and device.level
log = DeviceActivityLog(
    device_id=device_id,
    user_id=request.user_id,
    action=...,  # turn_on/turn_off/set_level
    old_status=old_status,
    new_status=device.status,
    old_level=old_level,
    new_level=device.level,
    triggered_by='user',
    reason=f'User updated device: {old_status}→{device.status} (level {old_level}→{device.level})'
)
db.session.add(log)
db.session.commit()
```

This guarantees user actions are recorded and available for usage computation.

---

## 4. How Usage Calculation Works

1. Read `DeviceActivityLog` records for the requested period.
2. Pair `turn_on` / `turn_off` events into intervals.
3. For currently-on devices, add interval from last `turn_on` to now.
4. Handle devices that were already on at period start by using period start as interval start.
5. Sum intervals per device and return `usage_minutes`, `usage_hours`, and `usage_display` (e.g., "2h 30m").

Endpoint: `GET /api/houses/{house_id}/device-usage?period=today`

---

## 5. Tests & Verification

Automated and manual tests were added/used to verify the fix.

- `simple_test.py`: starts backend via app context and issues a `PUT /api/devices/1` — verifies a new log created.
- `simple_check.py`: inspects `instance/smarthome.db` to report today's logs.
- `test_usage_calc.py`: calls `GET /api/houses/1/device-usage` via Flask test client and inspects response.
- `comprehensive_test.py`: toggles multiple devices and verifies logs & usage.

All tests passed locally. Example results: 6 logs created in a multi-device run; usage values like "7h 26m" returned for active devices.

---

## 6. Mobile App Integration

Files of interest:
- `mobile/src/screens/DashboardScreen.js` — renders "⏱️ Device Usage Today" and Activity Logs.
- `mobile/src/services/realtime.js` — Socket.IO client configured with `transports: ['websocket','polling']` and fallback behavior.
- `mobile/src/services/api.js` — REST calls (uses Bearer token auth).

User flow: mobile sends `PUT /api/devices/{id}` → backend updates device + creates log → dashboard calls usage endpoint or receives Socket.IO update → renders usage and logs.

---

## 7. Quick Start & Manual Tests

Start backend:

```bash
cd "c:\Users\namkz\Desktop\dacn\dadn\New folder\"
python app.py
```

Run a quick check locally (Flask test client based):

```bash
python simple_test.py
python simple_check.py
python test_usage_calc.py
```

Mobile manual test:
1. Open Expo app (mobile) configured to `http://10.0.185.222:8000/api`.
2. Toggle a device from Devices screen.
3. Refresh Dashboard — check "⏱️ Device Usage Today" and Activity Logs.

---

## 8. Troubleshooting

- If dashboard still shows "0h 0m": ensure backend is running and check `simple_check.py` for logs.
- Look for backend console messages: `Activity logged:`.
- Verify API URL in `mobile/.env.local` and that Bearer token auth is working.

---

## 9. Files Merged & Removed

The following documentation files were consolidated into this single `PROJECT_DOCUMENTATION.md`:
- `FIX_SUMMARY.md`
- `IMPLEMENTATION_SUMMARY.md`
- `MOBILE_DASHBOARD_GUIDE.md`
- `VERIFICATION_REPORT.md`
- `QUICK_START.md`

The originals were removed from the repo to avoid duplication. (See commit.)

---

## 10. Next Steps

1. Verify mobile Dashboard in a device/Expo client.
2. Optionally move test scripts into a `tests/` folder and add a `requirements.txt` for CI.
3. Consider adding a small script to export activity logs for analytics.

---

## 11. Contact / Notes

If you want any sections shortened, converted to Vietnamese, or moved into `README.md`, tell me which parts to keep.
