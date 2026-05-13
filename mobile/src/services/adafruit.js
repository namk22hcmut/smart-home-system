/**
 * Adafruit Integration Service - SIMPLIFIED VERSION
 * 
 * Demo Setup: Only 3 Feeds (humidity, temperature, fan)
 * No complex mappings or feed_key lookups
 * 
 * 📌 ON-DEMAND ONLY - No auto-polling
 * Called when user interacts (refresh, control, etc.)
 */

import { apiService } from './api';

// ============================================
// 3 FIXED FEEDS
// ============================================
const FEEDS = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  FAN: 'fan',
};

export const adafruitService = {
  /**
   * Get temperature data from Adafruit
   */
  getTemperatureData: async (limit = 48) => {
    try {
      const response = await apiService.get(
        `/adafruit/data/${FEEDS.TEMPERATURE}?limit=${limit}`
      );
      
      if (response?.success && response?.data) {
        const data = response.data;
        const latest = data[0];
        
        // Format for chart
        const reversed = [...data].reverse();
        const chartData = {
          labels: reversed.map(p => {
            const date = new Date(p.created_at);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }),
          values: reversed.map(p => parseFloat(p.value)),
        };
        
        console.log(`✅ Temperature: ${latest?.value}°C`);
        return { success: true, latestValue: latest?.value, chartData, data };
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
  getHumidityData: async (limit = 48) => {
    try {
      const response = await apiService.get(
        `/adafruit/data/${FEEDS.HUMIDITY}?limit=${limit}`
      );
      
      if (response?.success && response?.data) {
        const data = response.data;
        const latest = data[0];
        
        // Format for chart
        const reversed = [...data].reverse();
        const chartData = {
          labels: reversed.map(p => {
            const date = new Date(p.created_at);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }),
          values: reversed.map(p => parseFloat(p.value)),
        };
        
        console.log(`✅ Humidity: ${latest?.value}%`);
        return { success: true, latestValue: latest?.value, chartData, data };
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
  getFanData: async (limit = 5) => {
    try {
      const response = await apiService.get(
        `/adafruit/data/${FEEDS.FAN}?limit=${limit}`
      );
      
      if (response?.success && response?.data) {
        const data = response.data;
        const latest = data[0];
        
        console.log(`✅ Fan level: ${latest?.value}%`);
        return { success: true, latestValue: latest?.value, data };
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
  setFanLevel: async (level) => {
    try {
      const normalizedLevel = Math.max(0, Math.min(100, level));
      
      // Control fan via API (which publishes to Adafruit)
      const response = await apiService.put('/devices/1', {
        level: normalizedLevel,
      });
      
      if (response?.success) {
        console.log(`✅ Fan set to ${normalizedLevel}%`);
        return { success: true, level: normalizedLevel };
      }
      return { success: false };
    } catch (error) {
      console.error('❌ Fan control error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get all sensor data (temperature + humidity) for dashboard
   */
  getAllSensorData: async () => {
    try {
      const [tempResult, humidityResult] = await Promise.all([
        adafruitService.getTemperatureData(48),
        adafruitService.getHumidityData(48),
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
