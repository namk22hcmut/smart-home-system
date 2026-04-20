/**
 * Real-time Socket.IO Service - Live Sensor & Device Updates
 * Dynamically configured via Expo Constants from app.config.js
 */
import io from 'socket.io-client';
import { Platform } from 'react-native';
import { AsyncStorage } from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Socket URL from Expo config (.env.local or app.config.js)
// Remove '/api' suffix since Socket.IO connects to root path
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
const SOCKET_URL = API_URL.replace('/api', '');


let socket = null;
let listeners = {}; // Store event listeners

export const realtimeService = {
  // Connect to Socket.IO server
  connect: async () => {
    return new Promise((resolve, reject) => {
      try {
        // Disconnect existing connection if any
        if (socket && socket.connected) {
          socket.disconnect();
        }

        socket = io(SOCKET_URL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          console.log('✅ Connected to real-time server');
          resolve(socket);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          reject(error);
        });

        socket.on('disconnect', () => {
          console.log('🔌 Disconnected from real-time server');
        });

      } catch (error) {
        console.error('❌ Error initializing socket:', error);
        reject(error);
      }
    });
  },

  // Authenticate with token
  authenticate: async (token) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('auth', { token });

      socket.on('auth_success', (data) => {
        console.log('✅ Socket authenticated:', data);
        resolve(data);
      });

      socket.on('auth_failed', (error) => {
        console.error('❌ Socket auth failed:', error);
        reject(error);
      });
    });
  },

  // Subscribe to real-time updates
  subscribeToRealtimeUpdates: async (token) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('subscribe_realtime', { token });

      socket.on('realtime_subscribed', (data) => {
        console.log('✅ Subscribed to real-time updates:', data);
        resolve(data);
      });
    });
  },

  // Listen to real-time updates
  onRealtimeUpdate: (callback) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.on('realtime_update', (data) => {
      console.log('📡 Real-time update received:', data);
      callback(data);
    });
  },

  // Register event listener
  addEventListener: (eventName, callback) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(callback);

    socket.on(eventName, (data) => {
      listeners[eventName].forEach(cb => cb(data));
    });
  },

  // Remove event listener
  removeEventListener: (eventName, callback) => {
    if (!listeners[eventName]) return;
    
    listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
    
    if (listeners[eventName].length === 0) {
      socket.off(eventName);
      delete listeners[eventName];
    }
  },

  // Disconnect
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      listeners = {};
      console.log('🔌 Socket disconnected');
    }
  },

  // Get socket instance
  getSocket: () => socket,

  // Check if connected
  isConnected: () => socket && socket.connected,
};

export default realtimeService;
