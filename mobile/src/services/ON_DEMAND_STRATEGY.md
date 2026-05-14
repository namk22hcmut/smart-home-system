/**
 * ON-DEMAND ADAFRUIT DATA FETCHING STRATEGY
 * ==========================================
 * 
 * Goal: Avoid automatic background polling. Only fetch data when user explicitly interacts with the app.
 * 
 * IMPLEMENTATION:
 * 1. DevicesScreen: 
 *    - Remove useEffect auto-load ✅
 *    - Fetch Adafruit data ONLY when:
 *      a) User refreshes (pull-down) → loadDevices()
 *      b) User controls device (toggle/slider) → handleDeviceControl()
 *    - No periodic polling
 * 
 * 2. DashboardScreen:
 *    - Remove auto-load from loadDashboardData() ✅
 *    - Fetch sensor data ONLY when:
 *      a) User clicks 🔄 refresh button → loadAdafruitSensorData()
 *      b) User selects sensor tab → handleSensorSelection() [optional: fetch on tab click]
 *      c) Real-time Socket.IO update arrives (from server)
 * 
 * 3. DemoTestScreen:
 *    - Remove useEffect auto-load on room change ✅
 *    - Load data ONLY when:
 *      a) User clicks "🎲 Random Pick" button → loadRoomData()
 *      b) User clicks "📤 Test Control" button → testDeviceControl()
 *      c) User clicks "📡 Fetch Sensor Data" button → testSensorDataFetch()
 * 
 * BENEFITS:
 * ✅ Reduces API calls - only when needed
 * ✅ Saves battery on mobile
 * ✅ Faster app performance
 * ✅ Lower server load
 * ✅ Better for demo (controlled testing)
 * 
 * TRADE-OFFS:
 * ❌ Data might be slightly stale (no auto-refresh)
 * ❌ User needs to manually refresh to see latest data
 * 
 * SOLUTION:
 * - Real-time Socket.IO updates from server keep data fresh
 * - User can manually refresh anytime with button
 * - Pull-to-refresh on screens
 */

export const ON_DEMAND_STRATEGY = {
  description: 'On-demand Adafruit data fetching (no auto-polling)',
  
  triggers: {
    devices: [
      'User pulls down to refresh (loadDevices)',
      'User toggles ON/OFF (handleDeviceControl)',
      'User adjusts level slider (handleDeviceControl)',
    ],
    sensors: [
      'User clicks 🔄 refresh button in dashboard',
      'Real-time Socket.IO update from server',
      'User runs DemoTestScreen test',
    ],
  },

  removedAutoLoads: [
    'DevicesScreen useEffect with devices.length dependency ✅',
    'DashboardScreen loadAdafruitSensorData() auto-call ✅',
    'DemoTestScreen useEffect on room change ✅',
  ],
};
