# Device Scheduling API Documentation

## Overview
Complete REST API for managing device schedules with real-time execution and duration tracking.

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Create Schedule
**POST** `/devices/{device_id}/schedules`

Create a new schedule for a device.

#### Request Body
```json
{
  "scheduled_time": "14:30",
  "action_status": "on",
  "action_level": 80,
  "duration_minutes": 120,
  "days_of_week": "0,1,2,3,4,5,6",
  "is_active": true
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduled_time | string (HH:MM) | Yes | Time to execute (24-hour format) |
| action_status | string | Yes | "on" or "off" |
| action_level | integer | No | Device level 0-100 (default: 0) |
| duration_minutes | integer | No | How long device runs. 0=forever (default: 0) |
| days_of_week | string | No | "0,1,2,3,4,5,6" for Sun-Sat (default: all days) |
| is_active | boolean | No | Enable/disable schedule (default: true) |

#### Response (201 Created)
```json
{
  "success": true,
  "schedule_id": 42,
  "message": "Schedule created: 14:30 for 120 minutes"
}
```

#### Error Responses
- **404** - Device not found
- **400** - Invalid parameters (duration < 0, invalid time format)
- **500** - Server error

---

### 2. Get Device Schedules
**GET** `/devices/{device_id}/schedules`

Retrieve all schedules for a specific device.

#### Parameters
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| device_id | integer | URL | Device ID |

#### Response (200 OK)
```json
{
  "success": true,
  "device_id": 1,
  "device_name": "Living Room Light",
  "schedules": [
    {
      "schedule_id": 5,
      "device_id": 1,
      "scheduled_time": "07:00",
      "action_status": "on",
      "action_level": 80,
      "duration_minutes": 120,
      "days_of_week": "0,1,2,3,4,5,6",
      "is_active": true,
      "last_triggered_at": "2024-05-13T07:00:15.123456",
      "auto_off_at": null,
      "created_at": "2024-05-12T10:30:00.000000"
    },
    {
      "schedule_id": 6,
      "device_id": 1,
      "scheduled_time": "22:30",
      "action_status": "off",
      "action_level": 0,
      "duration_minutes": 0,
      "days_of_week": "0,1,2,3,4,5,6",
      "is_active": true,
      "last_triggered_at": "2024-05-13T22:30:00.123456",
      "auto_off_at": null,
      "created_at": "2024-05-12T11:00:00.000000"
    }
  ]
}
```

#### Error Responses
- **404** - Device not found
- **500** - Server error

---

### 3. Update Schedule
**PUT** `/schedules/{schedule_id}`

Update an existing schedule.

#### Request Body
```json
{
  "scheduled_time": "15:30",
  "action_status": "on",
  "action_level": 90,
  "duration_minutes": 180,
  "days_of_week": "1,2,3,4,5",
  "is_active": true
}
```

#### Parameters
All parameters from Create Schedule, all optional for updates

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Schedule updated",
  "schedule": {
    "schedule_id": 5,
    "device_id": 1,
    "scheduled_time": "15:30",
    "action_status": "on",
    "action_level": 90,
    "duration_minutes": 180,
    "days_of_week": "1,2,3,4,5",
    "is_active": true,
    "created_at": "2024-05-12T10:30:00.000000"
  }
}
```

#### Error Responses
- **404** - Schedule not found
- **400** - Invalid parameters
- **500** - Server error

---

### 4. Delete Schedule
**DELETE** `/schedules/{schedule_id}`

Delete a schedule.

#### Parameters
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| schedule_id | integer | URL | Schedule ID to delete |

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

#### Error Responses
- **404** - Schedule not found
- **500** - Server error

---

## WebSocket Events

### Event: `schedule_executed`
Emitted when a schedule executes at scheduled time.

```javascript
socket.on('schedule_executed', (data) => {
  // data = {
  //   device_id: 1,
  //   device_name: "Living Room Light",
  //   action: "on",
  //   level: 80,
  //   timestamp: "2024-05-13T07:00:15.123456",
  //   duration: 120
  // }
});
```

### Event: `schedule_auto_off`
Emitted when device auto-turns off after duration expires.

```javascript
socket.on('schedule_auto_off', (data) => {
  // data = {
  //   device_id: 1,
  //   device_name: "Living Room Light",
  //   timestamp: "2024-05-13T09:00:15.123456",
  //   reason: "After 120 minute(s)"
  // }
});
```

---

## Data Types & Formats

### Time Format
- **Format**: 24-hour (HH:MM)
- **Examples**: "07:00", "14:30", "23:59"
- **Validation**: Must be valid time (00:00-23:59)

### Days of Week
- **Format**: Comma-separated integer list "0,1,2,3,4,5,6"
- **Values**: 0=Sunday, 1=Monday, ..., 6=Saturday
- **Examples**:
  - "0,1,2,3,4,5,6" = Every day
  - "1,2,3,4,5" = Monday-Friday
  - "0,6" = Weekends only

### Action Status
- **"on"**: Turn device on to specified level
- **"off"**: Turn device off (level ignored)

### Duration Minutes
- **0**: Device runs forever (no auto-off)
- **N > 0**: Device auto-turns off after N minutes
- **Examples**:
  - 60 = 1 hour
  - 120 = 2 hours
  - 1440 = 1 day

---

## Example Usage

### TypeScript/React Native
```typescript
import apiService from './api';

// Create schedule
const createSchedule = async (deviceId: number) => {
  const response = await apiService.post(
    `/devices/${deviceId}/schedules`,
    {
      scheduled_time: '14:30',
      action_status: 'on',
      action_level: 80,
      duration_minutes: 120,
      days_of_week: '1,2,3,4,5',  // Mon-Fri
      is_active: true
    }
  );
  return response.data;
};

// Get all schedules
const getSchedules = async (deviceId: number) => {
  const response = await apiService.get(`/devices/${deviceId}/schedules`);
  return response.data.schedules;
};

// Update schedule
const updateSchedule = async (scheduleId: number, updates: any) => {
  const response = await apiService.put(
    `/schedules/${scheduleId}`,
    updates
  );
  return response.data;
};

// Delete schedule
const deleteSchedule = async (scheduleId: number) => {
  const response = await apiService.delete(`/schedules/${scheduleId}`);
  return response.data;
};

// Listen for real-time events
import io from 'socket.io-client';

const socket = io('http://localhost:8000');

socket.on('schedule_executed', (data) => {
  console.log(`✅ Schedule executed: ${data.device_name}`);
  // Update UI, show notification, etc.
});

socket.on('schedule_auto_off', (data) => {
  console.log(`🔴 Auto-off: ${data.device_name}`);
  // Update device status in UI
});
```

### cURL Examples

```bash
# Create schedule
curl -X POST http://localhost:8000/api/devices/1/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "scheduled_time": "14:30",
    "action_status": "on",
    "action_level": 80,
    "duration_minutes": 120,
    "days_of_week": "1,2,3,4,5",
    "is_active": true
  }'

# Get schedules
curl http://localhost:8000/api/devices/1/schedules \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update schedule
curl -X PUT http://localhost:8000/api/schedules/5 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "duration_minutes": 180,
    "is_active": false
  }'

# Delete schedule
curl -X DELETE http://localhost:8000/api/schedules/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Background Executor Details

### How It Works
1. **Every 60 seconds**, the schedule executor wakes up
2. **For each active schedule**:
   - Checks if today matches days_of_week
   - Checks if current time is within ±60 seconds of scheduled_time
   - Prevents same-day duplicates via last_triggered_at
3. **On match**:
   - Sets device to action_status/action_level
   - Updates last_triggered_at
   - If duration > 0: calculates auto_off_at and stores it
   - Creates Notification
   - Broadcasts WebSocket event
   - Logs to DeviceActivityLog
4. **For auto-off**:
   - If auto_off_at is set and current time >= auto_off_at
   - Turns device off (status='off', level=0)
   - Creates notification
   - Broadcasts WebSocket event
   - Logs action

### Duplicate Prevention
- `last_triggered_at` prevents same-day re-execution
- Resets at midnight daily
- Example: Schedule at 14:30 executes once today, then tomorrow at 14:30

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Schedule successfully created |
| 400 | Bad Request | Invalid time format, duration < 0 |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Device/Schedule doesn't exist |
| 500 | Server Error | Database error, internal exception |

---

## Rate Limiting
Currently no rate limiting implemented. Consider adding for production:
- 100 requests/minute per user
- 10 schedules per device (soft limit)

---

## Version
- **Current Version**: 1.0
- **Last Updated**: May 13, 2024
- **API Stability**: Stable for production use
