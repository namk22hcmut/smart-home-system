/**
 * Auth Service - User Authentication & Token Management (Web + Native compatible)
 * Dynamically configured via Expo Constants from app.config.js
 */
import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

// Use localStorage for web, AsyncStorage for native
let storage;
if (Platform.OS === 'web') {
  storage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  };
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

// Get API URL from Expo config (.env.local or app.config.js)
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';

const authClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased from 10s to 30s
});

const authService = {
  // Login user
  login: async (username, password) => {
    try {
      const response = await authClient.post('/auth/login', {
        username,
        password,
      });

      if (response.data.success) {
        // Save token to storage
        await storage.setItem('authToken', response.data.token);
        await storage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Login failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed',
      };
    }
  },

  // Signup user
  signup: async (username, email, password, fullName = '') => {
    try {
      const response = await authClient.post('/auth/register', {
        username,
        email,
        password,
        full_name: fullName,
      });

      if (response.data.success) {
        // Save token to storage
        await storage.setItem('authToken', response.data.token);
        await storage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Signup failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Signup failed',
      };
    }
  },

  // Get stored token
  getToken: async () => {
    try {
      return await storage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Get stored user
  getUser: async () => {
    try {
      const userString = await storage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await storage.getItem('authToken');
      return !!token;
    } catch (error) {
      return false;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await storage.removeItem('authToken');
      await storage.removeItem('user');
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  },

  // Verify token (optional - check if token is still valid)
  verifyToken: async (token) => {
    try {
      const response = await authClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.success;
    } catch (error) {
      return false;
    }
  },
};

export default authService;
