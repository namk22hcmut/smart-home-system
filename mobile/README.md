# 📱 Smart Home Mobile App - React Native

React Native mobile application để điều khiển Smart Home trên iOS, Android & Web.

## 🚀 Quick Start

### Setup & Run

```bash
# 1. Navigate to mobile folder
cd mobile

# 2. Install dependencies
npm install

# 3. Start Expo server
npm start
```

### Try the App

- **📱 Expo Go** (easiest): Scan QR code with Expo Go app
- **🤖 Android**: `npm run android` (requires Android Studio)
- **🍎 iOS**: `npm run ios` (macOS only)
- **🌐 Web**: `npm run web`

## 📁 Project Structure

```
mobile/
├── App.js                      # Navigation setup
├── app.json                    # Expo config
├── package.json
├── src/
│   ├── screens/               # Screen components
│   │   ├── HomeScreen.js      # Houses list
│   │   ├── FloorsScreen.js    # Floors list
│   │   ├── RoomsScreen.js     # Rooms list
│   │   └── DevicesScreen.js   # Device control (main)
│   └── services/
│       └── api.js             # Backend API client
└── assets/
```

## 🏠 App Navigation

```
🏠 Home (Houses)
  └─ 🏢 Floors (Select floor)
      └─ 🚪 Rooms (Select room)
          └─ ⚙️ Devices (Control)
              ├─ ON/OFF toggle
              └─ Level slider 0-100%
```

## ✨ Features

✅ Browse all your smart homes  
✅ Navigate through floors  
✅ View rooms in each floor  
✅ **Real-time device control** (on/off)  
✅ **Adjust device level** (0-100%)  
✅ Pull-to-refresh  
✅ Responsive mobile UI  

## 🔧 Backend Integration

App connects to backend at: `http://10.0.106.239:8000/api`

**API Endpoints Used:**
- `GET /api/houses` → Get all houses
- `GET /api/houses/{id}/floors` → Get floors
- `GET /api/floors/{id}/rooms` → Get rooms
- `GET /api/rooms/{id}/devices` → Get devices
- `POST /api/device-status` → Update device (on/off, level)

## 🎮 Device Control

### Toggle Device
Tap **ON/OFF** button to enable/disable

### Adjust Level
When device is ON:
- Slider appears (0-100%)
- Drag to adjust intensity
- Real-time backend sync

## 🎨 UI Design

- Clean card-based layout
- Blue (#007AFF) accent color
- Material design principles
- Smooth animations
- Mobile-optimized

## 📞 Troubleshooting

**Cannot connect to backend?**
```bash
# Verify backend is running
curl http://10.0.106.239:8000/api/health
```

**Module not found error?**
```bash
npm install
npm start
```

**Expo Go QR code not working?**
- Ensure phone on same WiFi
- Try: `npm start -- --tunnel`

## 🚀 Future Enhancements

- [ ] User authentication
- [ ] Push notifications
- [ ] Offline mode
- [ ] Voice control
- [ ] Dark mode
- [ ] Automation rules

---

**Status**: ✅ Ready  
**Platform**: React Native + Expo  
**Targets**: iOS, Android, Web
