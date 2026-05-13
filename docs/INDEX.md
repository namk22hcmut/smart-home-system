# 📚 Smart Home IoT System - Documentation Index

**Version:** 3.3 | **Last Updated:** May 13, 2026

---

## 🚀 Start Here

### For New Users
1. **[SETUP.md](./SETUP.md)** - 15 minute setup guide
   - System requirements
   - Installation steps
   - Running backend & mobile
   - First login

2. **[README.md](../README.md)** - Project overview
   - Features overview
   - Quick start commands
   - API examples
   - Technology stack

---

## 📖 Complete Documentation

### Project Overview
- **[PROJECT_DETAILS.md](./PROJECT_DETAILS.md)** - Key project information
  - Architecture overview
  - Feature list
  - Technology stack
  - Quick API reference

- **[PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)** - Complete reference
  - Full API documentation (50+ endpoints)
  - Database schema (20 tables)
  - Architecture details
  - Feature descriptions

### Version 3.3 (Current)
- **[IMPLEMENTATION_SUMMARY_v3.3.md](./IMPLEMENTATION_SUMMARY_v3.3.md)** - Schedule system details
  - Auto-off implementation
  - Real-time executor
  - WebSocket events
  - Mobile UI integration
  - Testing guide

- **[SCHEDULE_API_DOCUMENTATION.md](./SCHEDULE_API_DOCUMENTATION.md)** - Schedule API reference
  - All schedule endpoints
  - Request/response formats
  - WebSocket events
  - Usage examples
  - Error codes

---

## 🎯 Find What You Need

### "How do I..."

**...set up the project?**
→ [SETUP.md](./SETUP.md)

**...run the backend?**
→ [SETUP.md - Chạy Backend](./SETUP.md#chạy-backend)

**...run the mobile app?**
→ [SETUP.md - Chạy Mobile App](./SETUP.md#chạy-mobile-app)

**...understand the architecture?**
→ [PROJECT_DETAILS.md](./PROJECT_DETAILS.md) or [PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)

**...use the Schedule API?**
→ [SCHEDULE_API_DOCUMENTATION.md](./SCHEDULE_API_DOCUMENTATION.md)

**...create a device schedule?**
→ [SCHEDULE_API_DOCUMENTATION.md - Create Schedule](./SCHEDULE_API_DOCUMENTATION.md#1-create-schedule)

**...understand the schedule executor?**
→ [IMPLEMENTATION_SUMMARY_v3.3.md - Background Executor](./IMPLEMENTATION_SUMMARY_v3.3.md#-background-executor)

**...see all API endpoints?**
→ [PROJECT_COMPREHENSIVE_SUMMARY.md - API Endpoints](./PROJECT_COMPREHENSIVE_SUMMARY.md)

**...view the database schema?**
→ [PROJECT_COMPREHENSIVE_SUMMARY.md - Database](./PROJECT_COMPREHENSIVE_SUMMARY.md)

---

## 📊 Documentation Overview

| Document | Length | Focus | Best For |
|----------|--------|-------|----------|
| **SETUP.md** | 3 pages | Implementation | Getting started |
| **PROJECT_DETAILS.md** | 5 pages | Architecture | Quick overview |
| **IMPLEMENTATION_SUMMARY_v3.3.md** | 8 pages | Schedule system | Understanding v3.3 features |
| **SCHEDULE_API_DOCUMENTATION.md** | 6 pages | API reference | API integration |
| **PROJECT_COMPREHENSIVE_SUMMARY.md** | 15+ pages | Complete system | Deep dive |

---

## 🔍 Quick Reference

### Database Tables (20 total)
User, House, Floor, Room, Device, Sensor, SensorData, Schedule, Notification, DeviceActivityLog, AutomationRule, RuleCondition, Threshold, Alert, Dashboard, AdafruitFeedMapping, and more.

### Main API Endpoints
```
GET     /api/devices/status              # Get device statuses
GET     /api/devices/{id}/schedules      # Get device schedules
POST    /api/devices/{id}/schedules      # Create schedule
PUT     /api/schedules/{id}              # Update schedule
DELETE  /api/schedules/{id}              # Delete schedule
... and 45+ more
```

### WebSocket Events
- `schedule_executed` - When schedule turns device on/off
- `schedule_auto_off` - When device auto-turns off
- `device_status_changed` - When device status changes
- `notification_created` - New notification arrived
- ... and more

---

## 🎓 Learning Path

1. **Quick Start** (5 min)
   - Skim [README.md](../README.md)
   - Run setup commands from [SETUP.md](./SETUP.md)

2. **Understanding** (20 min)
   - Read [PROJECT_DETAILS.md](./PROJECT_DETAILS.md)
   - Explore mobile app

3. **Deep Dive** (1 hour)
   - Study [IMPLEMENTATION_SUMMARY_v3.3.md](./IMPLEMENTATION_SUMMARY_v3.3.md)
   - Review [PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)

4. **Integration** (2 hours)
   - Reference [SCHEDULE_API_DOCUMENTATION.md](./SCHEDULE_API_DOCUMENTATION.md)
   - Build schedule features

---

## 🔗 External Resources

- **Flask Documentation:** https://flask.palletsprojects.com/
- **React Native:** https://reactnative.dev/
- **Expo:** https://expo.dev/
- **SQLAlchemy:** https://www.sqlalchemy.org/
- **Socket.IO:** https://socket.io/
- **Adafruit IO:** https://io.adafruit.com/

---

## 📞 Support

- 📋 **Setup Issues?** → Check [SETUP.md](./SETUP.md) troubleshooting
- 🔌 **API Questions?** → Reference [SCHEDULE_API_DOCUMENTATION.md](./SCHEDULE_API_DOCUMENTATION.md)
- 🏗️ **Architecture Questions?** → Read [PROJECT_COMPREHENSIVE_SUMMARY.md](./PROJECT_COMPREHENSIVE_SUMMARY.md)
- 🐛 **Bugs?** → Check implementation guides for context
- 💬 **General?** → Start with [README.md](../README.md)

---

## 📝 Document Versions

- **v3.3** - Current (May 13, 2026)
  - Added Schedule system documentation
  - Full API reference for schedules
  - Auto-off implementation details

- **v3.2** - Previous
  - Initial schedule executor implementation
  - WebSocket notifications

- **v3.1** - Original
  - Core REST API
  - Device control
  - Basic automation

---

**Happy reading! Choose your starting document above.** 📚✨
