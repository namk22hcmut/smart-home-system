/**
 * Adafruit Integration Service - SIMPLIFIED VERSION
 * 
 * Room-aware setup: data is fetched by sensor_id/device context
 * so the app no longer depends on fixed Adafruit feed names.
 * 
 * 📌 ON-DEMAND ONLY - No auto-polling
 * Called when user interacts (refresh, control, etc.)
 */

import { apiService } from './api';
import { formatShortTime } from '../utils/time';

export const ADAFRUIT_TARGET = {
  houseId: 1,
  floorId: 1,
  roomId: 1,
};

export const adafruitService = {
  isTargetRoom: (roomId) => Number(roomId) === ADAFRUIT_TARGET.roomId,

  getLatestReading: (data = []) => {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const sorted = [...data].sort((left, right) => {
      const leftTime = new Date(left?.created_at || left?.timestamp || 0).getTime();
      const rightTime = new Date(right?.created_at || right?.timestamp || 0).getTime();
      return leftTime - rightTime;
    });

    return sorted[sorted.length - 1] || null;
  },

  getSensorHistoryData: async (sensorId, limit = 48) => {
    try {
      const response = await apiService.get(`/sensors/${sensorId}/data`);

      if (response?.success && response?.data) {
        const data = Array.isArray(response.data) ? response.data.slice(0, limit) : [];
        const latest = adafruitService.getLatestReading(data);
        const reversed = [...data].sort((left, right) => new Date(left?.timestamp || 0) - new Date(right?.timestamp || 0));
        const chartData = {
          labels: reversed.map(p => formatShortTime(p.timestamp)),
          values: reversed.map(p => parseFloat(p.value)),
        };

        return { success: true, latestValue: latest?.value, chartData, data };
      }

      return { success: false };
    } catch (error) {
      console.error(`❌ Sensor history fetch error (sensor_id=${sensorId}):`, error.message);
      return { success: false };
    }
  },

  getHouseSensors: async (houseId) => {
    const sensors = [];

    const floors = await apiService.getFloors(houseId);
    for (const floor of floors) {
      const rooms = await apiService.getRooms(floor.id);
      for (const room of rooms) {
        const response = await apiService.get(`/rooms/${room.id}/sensors`);
        if (response?.success && Array.isArray(response.data)) {
          sensors.push(...response.data.map(sensor => ({
            ...sensor,
            room_id: room.id,
            floor_id: floor.id,
          })));
        }
      }
    }

    return sensors;
  },

  /**
   * Get temperature data from Adafruit
   */
  getTemperatureData: async (limit = 48, sensorId = null) => {
    try {
      if (sensorId) {
        const result = await adafruitService.getSensorHistoryData(sensorId, limit);
        if (result.success) {
          console.log(`✅ Temperature sensor ${sensorId}: ${result.latestValue}°C`);
        }
        return result;
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Temperature fetch error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get humidity data from Adafruit
   */
  getHumidityData: async (limit = 48, sensorId = null) => {
    try {
      if (sensorId) {
        const result = await adafruitService.getSensorHistoryData(sensorId, limit);
        if (result.success) {
          console.log(`✅ Humidity sensor ${sensorId}: ${result.latestValue}%`);
        }
        return result;
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Humidity fetch error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get fan status from Adafruit
   */
  // Get fan status by device id. If deviceId omitted, returns failure.
  getFanData: async (deviceId = null) => {
    try {
      if (!deviceId) return { success: false, error: 'deviceId required' };

      const response = await apiService.get(`/devices/${deviceId}`);
      if (response?.success && response?.device) {
        const device = response.device;
        return { success: true, latestValue: device.level, status: device.status, device };
      }
      return { success: false };
    } catch (error) {
      console.error('❌ Fan fetch error:', error.message);
      return { success: false };
    }
  },

  /**
   * Set fan level (0-100)
   */
  // Set fan level for a specific device id (0-100)
  setFanLevel: async (deviceId, level) => {
    try {
      if (!deviceId) return { success: false, error: 'deviceId required' };
      const normalizedLevel = Math.max(0, Math.min(100, level));

      // Use device-status endpoint to update device
      const response = await apiService.post('/device-status', {
        device_id: deviceId,
        level: normalizedLevel,
      });

      if (response?.success) {
        console.log(`✅ Fan set to ${normalizedLevel}% for device ${deviceId}`);
        return { success: true, level: normalizedLevel };
      }
      return { success: false };
    } catch (error) {
      console.error('❌ Fan control error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get all sensor data (temperature + humidity) for a house
   */
  getAllSensorData: async (houseId) => {
    try {
      if (!houseId) {
        return { success: false, error: 'houseId is required' };
      }

      // Get ALL sensors from the house (not just room 1)
      const sensors = await adafruitService.getHouseSensors(houseId);
      const temperatureSensor = sensors.find(sensor => sensor.type === 'temperature');
      const humiditySensor = sensors.find(sensor => sensor.type === 'humidity');

      const [tempResult, humidityResult] = await Promise.all([
        temperatureSensor ? adafruitService.getTemperatureData(48, temperatureSensor.id) : Promise.resolve({ success: false }),
        humiditySensor ? adafruitService.getHumidityData(48, humiditySensor.id) : Promise.resolve({ success: false }),
      ]);

      return {
        success: tempResult.success && humidityResult.success,
        temperature: tempResult,
        humidity: humidityResult,
      };
    } catch (error) {
      console.error('❌ Sensor data fetch error:', error.message);
      return { success: false };
    }
  },

  /**
   * 🔥 Fetch LIVE data from Adafruit (on-demand via button)
   * Fetches latest value from Adafruit and saves to database
   */
  fetchLiveData: async (sensorId) => {
    try {
      console.log(`📡 [UPDATE] Fetching LIVE data from Adafruit for sensor_id: ${sensorId}`);
      const response = await apiService.post(`/adafruit/fetch-live`, {
        sensor_id: sensorId
      });
      
      console.log(`📡 [FETCH-LIVE] Response:`, response);
      
      if (response?.success) {
        console.log(`✅ Live data fetched: sensor_id=${sensorId}, value=${response.value}`);
        return { success: true, data: response };
      }
      
      const errorMsg = response?.error || 'Unknown error from API';
      console.log(`⚠️ Live fetch failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } catch (error) {
      console.error(`❌ Live fetch error (sensor_id=${sensorId}):`, error);
      
      // Try to extract error message from various sources
      let errorMsg = 'Failed to fetch live data';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error; // API error
      } else if (error.response?.status === 401) {
        errorMsg = 'Unauthorized - please login again';
      } else if (error.response?.status === 404) {
        errorMsg = 'Sensor mapping not found';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error - try again later';
      } else if (error.message) {
        errorMsg = error.message; // Network error
      }
      
      console.error(`❌ [CATCH] Final error message: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
};

export default adafruitService;
