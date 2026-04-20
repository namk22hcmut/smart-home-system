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
      <Text style={styles.deleteButtonText}>✕</Text>
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
    // Prevent duplicate rapid calls
    if (isActionDebounced(notificationId, 'delete')) {
      return;
    }
    
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/notifications/${notificationId}`);
              
              if (response && response.success) {
                // Remove from local state
                setNotifications((prev) => {
                  const notification = prev.find(n => n.notification_id === notificationId);
                  const updated = prev.filter((n) => n.notification_id !== notificationId);
                  
                  // Update unread count if notification was unread
                  if (notification && !notification.is_read) {
                    setUnreadCount((count) => Math.max(0, count - 1));
                  }
                  
                  return updated;
                });
                Alert.alert('Success', 'Notification deleted');
              } else {
                console.error('[NotificationCenter] Delete failed:', response?.error);
                Alert.alert('Error', response?.error || 'Failed to delete notification');
              }
            } catch (error) {
              console.error('[NotificationCenter] Delete request failed:', error);
              Alert.alert('Delete Failed', error.message || 'An error occurred while deleting');
            }
          },
        },
      ]
    );
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

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'device_change':
        return '🔌';
      case 'threshold_alert':
        return '⚠️';
      case 'automation_trigger':
        return '🔄';
      default:
        return '🔔';
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
        <Text style={styles.emptyIcon}>🔔</Text>
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
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  emptyListContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  notificationItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBorder: {
    width: 4,
    backgroundColor: '#ddd',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  unreadNotification_border: {
    backgroundColor: '#007AFF',
  },
  notificationContentArea: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTouchable: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginLeft: 28,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    flexShrink: 0,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationCenter;
