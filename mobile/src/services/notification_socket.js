/**
 * Notification Socket Service
 * Handles real-time WebSocket connections for notifications
 * Dynamically configured via Expo Constants from app.config.js
 */

import io from 'socket.io-client';
import Constants from 'expo-constants';

// SocketIO client instance
let socket = null;
let listeners = {};

// Get Socket URL from Expo config (.env.local or app.config.js)
// Remove '/api' suffix since Socket.IO connects to root path
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
const SOCKET_URL = API_URL.replace('/api', '');

const NotificationSocket = {
  /**
   * Initialize SocketIO connection to backend
   * @param {string} token - JWT authentication token
   * @param {number} userId - User ID for room subscription
   * @param {object} callbacks - Callbacks for notification events
   */
  connect: (token, userId, callbacks = {}) => {
    if (socket && socket.connected) {
      console.log('✅ Socket already connected');
      return socket;
    }

    try {
      // Connect to backend SocketIO server
      socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Handle connection
      socket.on('connect', () => {
        console.log('🔗 Connected to SocketIO');
        
        // Authenticate with token
        socket.emit('auth', { token });
      });

      // Handle authentication success
      socket.on('auth_success', (data) => {
        console.log('✅ SocketIO authentication successful', data);
        
        // Subscribe to user notifications room
        socket.emit('subscribe_notifications', { user_id: userId, token });
        
        if (callbacks.onAuthSuccess) {
          callbacks.onAuthSuccess(data);
        }
      });

      // Handle authentication failure
      socket.on('auth_failed', (data) => {
        console.log('❌ SocketIO authentication failed', data);
        if (callbacks.onAuthFailed) {
          callbacks.onAuthFailed(data);
        }
      });

      // Handle subscription confirmation
      socket.on('subscription_confirmed', (data) => {
        console.log('🔔 Subscribed to notifications room:', data.room);
        if (callbacks.onSubscribed) {
          callbacks.onSubscribed(data);
        }
      });

      // Handle new notification received
      socket.on('notification_received', (notification) => {
        console.log('📤 New notification received:', notification.title);
        if (callbacks.onNotificationReceived) {
          callbacks.onNotificationReceived(notification);
        }
      });

      // Handle notification marked as read
      socket.on('notification_marked_read', (data) => {
        console.log('📖 Notification marked as read:', data);
        if (callbacks.onNotificationMarkedRead) {
          callbacks.onNotificationMarkedRead(data);
        }
      });

      // Handle notification deleted
      socket.on('notification_deleted', (data) => {
        console.log('🗑️ Notification deleted:', data);
        if (callbacks.onNotificationDeleted) {
          callbacks.onNotificationDeleted(data);
        }
      });

      // Handle all notifications cleared
      socket.on('notifications_cleared', (data) => {
        console.log('🗑️ All notifications cleared');
        if (callbacks.onNotificationsCleared) {
          callbacks.onNotificationsCleared(data);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('❌ SocketIO error:', error);
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from SocketIO');
        if (callbacks.onDisconnect) {
          callbacks.onDisconnect();
        }
      });

      // Store listeners for later reference
      listeners = callbacks;

      return socket;
    } catch (error) {
      console.error('❌ Error connecting to SocketIO:', error);
      throw error;
    }
  },

  /**
   * Disconnect socket
   */
  disconnect: () => {
    if (socket && socket.connected) {
      socket.disconnect();
      socket = null;
      listeners = {};
      console.log('🔌 Socket disconnected');
    }
  },

  /**
   * Check if socket is connected
   */
  isConnected: () => {
    return socket && socket.connected;
  },

  /**
   * Get notifications from server
   */
  getNotifications: () => {
    if (socket && socket.connected) {
      socket.emit('get_notifications');
    } else {
      console.warn('⚠️ Socket not connected');
    }
  },

  /**
   * Listen for specific event
   */
  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  },

  /**
   * Stop listening for specific event
   */
  off: (event) => {
    if (socket) {
      socket.off(event);
    }
  },

  /**
   * Emit event to server
   */
  emit: (event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`⚠️ Socket not connected, cannot emit ${event}`);
    }
  },

  /**
   * Get socket instance
   */
  getSocket: () => socket,
};

export default NotificationSocket;
