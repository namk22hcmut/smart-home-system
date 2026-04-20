/**
 * API Service - Backend Integration with Authentication (Web + Native compatible)
 * Dynamically configured via Expo Constants from app.config.js
 */
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use localStorage for web, AsyncStorage for native
let storage;
if (Platform.OS === 'web') {
  storage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  };
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

// Get API URL from Expo config (.env.local or app.config.js)
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased from 10s to 30s
  withCredentials: true, // Allow cookies and auth across domains
});

// Request interceptor - add token to Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('authToken');
      console.log('📍 Token from storage:', token ? '✅ Found (length: ' + token.length + ')' : '❌ Not found');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Authorization header SET for', config.url);
      } else {
        console.log('⚠️ No token found - request will be UNAUTHORIZED');
      }
    } catch (error) {
      console.error('❌ Error getting token:', error.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 (token expired)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } else {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
        }
        // Navigation to login should be handled by App.js
      } catch (e) {
        console.error('Error clearing auth:', e);
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Houses
  getHouses: async () => {
    try {
      const response = await apiClient.get('/houses');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching houses:', error);
      throw error;
    }
  },

  // Floors
  getFloors: async (houseId) => {
    try {
      const response = await apiClient.get(`/houses/${houseId}/floors`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching floors:', error);
      throw error;
    }
  },

  // Rooms
  getRooms: async (floorId) => {
    try {
      const response = await apiClient.get(`/floors/${floorId}/rooms`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  },

  // Devices
  getDevices: async (roomId) => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}/devices`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  getAllDevices: async () => {
    try {
      const response = await apiClient.get('/devices/status');
      return response.data.devices || [];
    } catch (error) {
      console.error('Error fetching devices status:', error);
      throw error;
    }
  },

  // Update Device
  updateDevice: async (deviceId, status, level) => {
    try {
      const response = await apiClient.post('/device-status', {
        device_id: deviceId,
        status: status,
        level: level,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  },

  // Health Check
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  // Generic HTTP Methods for admin/other endpoints
  get: async (endpoint, config = {}) => {
    try {
      const response = await apiClient.get(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`Error on GET ${endpoint}:`, error);
      throw error;
    }
  },

  post: async (endpoint, data = {}, config = {}) => {
    try {
      const response = await apiClient.post(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Error on POST ${endpoint}:`, error);
      throw error;
    }
  },

  put: async (endpoint, data = {}, config = {}) => {
    try {
      const response = await apiClient.put(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Error on PUT ${endpoint}:`, error);
      throw error;
    }
  },

  patch: async (endpoint, data = {}, config = {}) => {
    try {
      const response = await apiClient.patch(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Error on PATCH ${endpoint}:`, error);
      throw error;
    }
  },

  delete: async (endpoint, config = {}) => {
    try {
      const response = await apiClient.delete(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`Error on DELETE ${endpoint}:`, error);
      throw error;
    }
  },
};

export default apiService;
