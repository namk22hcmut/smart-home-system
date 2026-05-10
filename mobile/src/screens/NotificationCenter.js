import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';

// Extracted NotificationItem component (outside main component)
// This prevents React from recreating it on every render
const NotificationItem = React.memo(({
  item,
  handleMarkAsRead,
  handleDelete,
  getNotificationIcon,
  formatTime,
  styles,
}) => (
  <View
    style={[
      styles.notificationItemContainer,
      !item.is_read && styles.unreadNotification
    ]}
  >
    {/* Left border */}
    <View style={[
      styles.notificationBorder,
      !item.is_read && { backgroundColor: '#007AFF' }
    ]} />
    
    {/* Content area - mark as read on press */}
    <TouchableOpacity
      style={styles.notificationContentArea}
      onPress={() => {
        console.log('📖 Marking notification as read:', item.notification_id);
        handleMarkAsRead(item.notification_id);
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.notification_type)}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>
    </TouchableOpacity>

    {/* Delete button */}
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => {
        console.log('🗑️ Deleting notification:', item.notification_id);
        handleDelete(item.notification_id);
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.5}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  </View>
));

NotificationItem.displayName = 'NotificationItem';

const NotificationCenter = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isSignedIn } = useContext(AuthContext);
  
  // Debounce tracking for mark-as-read and delete
  const lastActionTime = useRef({});
  const DEBOUNCE_DELAY = 500; // milliseconds
  
  // Prevent duplicate fetches
  const isFetching = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current) {
      console.log('⏱️ Fetch already in progress, skipping...');
      return;
    }
    
    isFetching.current = true;
    console.log('🔄 FETCHING NOTIFICATIONS...');
    try {
      const response = await apiService.get('/notifications');
      console.log('📍 Notifications response:', response);
      if (response && response.success) {
        console.log('🔄 Fetched', response.notifications.length, 'notifications');
        setNotifications(response.notifications);
        setUnreadCount(response.unread_count || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      if (error.response?.status === 401) {
        // Token expired
        console.warn('⚠️ Token expired, please login again');
      } else {
        Alert.alert('Error', 'Failed to load notifications: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
    }
  }, []);

  // Initial load - chỉ chạy 1 lần khi component mount
  useEffect(() => {
    console.log('[NotificationCenter] Component mounted');
    fetchNotifications();
    
    return () => console.log('[NotificationCenter] Component unmounted');
  }, []); // Empty dependency - chỉ chạy 1 lần

  // Debug: Log when notifications change
  useEffect(() => {
    console.log(`[NotificationCenter] Notifications count: ${notifications.length}`);
  }, [notifications]);

  

  // Helper: Check if action is debounced
  const isActionDebounced = (notificationId, actionType) => {
    // ⚠️ TEMPORARILY DISABLED FOR TESTING
    return false;
    
    /*
    const key = `${actionType}_${notificationId}`;
    const now = Date.now();
    const lastTime = lastActionTime.current[key] || 0;
    
    if (now - lastTime < DEBOUNCE_DELAY) {
      console.log(`⏱️ Action debounced: ${actionType} for ID ${notificationId}`);
      return true;
    }
    
    lastActionTime.current[key] = now;
    return false;
    */
  };

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    // Prevent duplicate rapid calls
    if (isActionDebounced(notificationId, 'markRead')) {
      return;
    }
    
    try {
      const response = await apiService.put(`/notifications/${notificationId}/read`);
      if (response && response.success) {
        setNotifications((prev) => {
          const updated = prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: true } : n
          );
          return updated;
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        console.error('[NotificationCenter] Mark as read failed:', response?.error);
      }
    } catch (error) {
      console.error('[NotificationCenter] Error marking as read:', error);
    }
  }, []);

  // Delete notification
  const handleDelete = useCallback(async (notificationId) => {
    if (isActionDebounced(notificationId, 'delete')) {
      return;
    }

    try {
      const response = await apiService.delete(
        `/notifications/${notificationId}`
      );

      if (response && response.success) {
        setNotifications((prev) => {
          const notification = prev.find(
            n => n.notification_id === notificationId
          );

          const updated = prev.filter(
            n => n.notification_id !== notificationId
          );

          if (notification && !notification.is_read) {
            setUnreadCount((count) =>
              Math.max(0, count - 1)
            );
          }

          return updated;
        });
      } else {
        Alert.alert(
          'Error',
          response?.error || 'Failed to delete notification'
        );
      }
    } catch (error) {
      console.error(
        '[NotificationCenter] Delete request failed:',
        error
      );

      Alert.alert(
        'Delete Failed',
        error.message || 'Failed to delete notification'
      );
    }
  }, []);

  // Clear all notifications
  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Notifications',
      'This will delete all your notifications. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete('/notifications/clear-all');
              if (response && response.success) {
                setNotifications([]);
                setUnreadCount(0);
                Alert.alert('Success', 'All notifications cleared');
              }
            } catch (error) {
              console.error('[NotificationCenter] Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  }, []);

  // Set header options
  useEffect(() => {
      navigation.setOptions({
        headerTitle: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`,
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => handleClearAll()}
            style={{ paddingRight: 15 }}
          >
            <Text style={{ color: '#007AFF', fontSize: 12 }}>Clear All</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation, unreadCount, handleClearAll]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'device_change':
        return 'Device';

      case 'threshold_alert':
        return 'Alert';

      case 'automation_trigger':
        return 'Automation';

      default:
        return 'Notification';
    }
  };

  // Format timestamp
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Empty state
  if (!loading && notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCircle} />
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyMessage}>
          You're all caught up! Notifications will appear here.
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No Notifications</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <NotificationItem
                key={item.notification_id}
                item={item}
                handleMarkAsRead={handleMarkAsRead}
                handleDelete={handleDelete}
                getNotificationIcon={getNotificationIcon}
                formatTime={formatTime}
                styles={styles}
              />
            ))
          )}
          
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#6b7280',
  },

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  emptyListContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  emptyCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
  },

  refreshButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },

  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  notificationItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  unreadNotification: {
    backgroundColor: '#fcfcfc',
  },

  notificationBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#d1d5db',
  },

  notificationContentArea: {
    flex: 1,
    padding: 18,
    paddingRight: 70,
  },

  notificationContent: {
    flex: 1,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  notificationIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: 10,
  },

  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    marginLeft: 10,
    marginTop: 4,
  },

  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginTop: 6,
  },

  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,

    backgroundColor: '#f3f4f6',
    borderRadius: 10,

    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  deleteButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
});

export default NotificationCenter;
