import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';
import realtimeService from '../services/realtime';
import { MaterialIcons } from '@expo/vector-icons';

const DashboardScreen = ({ navigation }) => {
  const route = useRoute();
  const { house } = route.params || {};
  const { token } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Setup real-time connection
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        console.log('🔗 Connecting to real-time server...');
        await realtimeService.connect();
        
        // Authenticate
        if (token) {
          await realtimeService.authenticate(token);
          
          // Subscribe to updates
          await realtimeService.subscribeToRealtimeUpdates(token);
          setRealtimeConnected(true);
          
          // Listen to updates
          realtimeService.onRealtimeUpdate((data) => {
            console.log('📡 Received real-time update:', data);
            
            // Refresh dashboard when sensor/device data changes
            if (data.type === 'sensor' || data.type === 'device') {
              loadDashboardData(false); // Refresh without showing loader
            }
          });
        }
      } catch (error) {
        console.error('⚠️ Real-time connection failed:', error.message);
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      realtimeService.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (house && (house.house_id || house.id)) {
      loadDashboardData(true);
    } else {
      console.warn('❌ House parameter missing or invalid:', house);
      setLoading(false);
      Alert.alert('Error', 'House information not available');
    }
  }, [house]);

  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const houseId = house.house_id || house.id;
      console.log('📊 Loading dashboard for house:', houseId);

      // Get stats
      const statsResponse = await apiService.get(`/houses/${houseId}/stats`);
      console.log('✅ Stats response:', statsResponse);
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      } else {
        console.warn('❌ Stats not successful:', statsResponse);
      }

      // Get recent activities
      const activitiesResponse = await apiService.get(`/houses/${houseId}/activity-logs?limit=10`);
      console.log('✅ Activities response:', activitiesResponse);
      if (activitiesResponse.success) {
        setActivities(activitiesResponse.logs || []);
      } else {
        console.warn('❌ Activities not successful:', activitiesResponse);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data: ' + (error.message || 'Unknown error'));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSubtitle}>{house?.name || house?.house_name || 'House Dashboard'}</Text>
      </View>

      {stats && (
        <>
          {/* Devices Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔌 Device Statistics</Text>

            <View style={styles.statsGrid}>
              <StatCard
                title="Total Devices"
                value={stats.total_devices || 0}
                color="#FF6B6B"
                icon="devices"
              />
              <StatCard
                title="Online"
                value={stats.devices_online || 0}
                color="#4CAF50"
                icon="cloud-done"
              />
              <StatCard
                title="Offline"
                value={stats.devices_offline || 0}
                color="#FFA726"
                icon="cloud-off"
              />
              <StatCard
                title="Turned On"
                value={stats.devices_on || 0}
                color="#29B6F6"
                icon="power-settings-new"
              />
            </View>
          </View>

          {/* Infrastructure Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏠 Infrastructure</Text>

            <View style={styles.statsGrid}>
              <StatCard
                title="Floors"
                value={stats.total_floors || 0}
                color="#AB47BC"
                icon="domain"
              />
              <StatCard
                title="Rooms"
                value={stats.total_rooms || 0}
                color="#EC407A"
                icon="meeting-room"
              />
              <StatCard
                title="Sensors"
                value={stats.total_sensors || 0}
                color="#78909C"
                icon="sensors"
              />
              <StatCard
                title="Automation Rules"
                value={stats.automation_rules_total || 0}
                color="#FFB74D"
                icon="rule"
              />
            </View>
          </View>

          {/* Automation Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Automation Rules</Text>

            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Active Rules</Text>
                <Text style={styles.statusValue}>{stats.automation_rules_active || 0} / {stats.automation_rules_total || 0}</Text>
              </View>
              <View style={[styles.progressBar, { width: '100%', height: 8, backgroundColor: '#E0E0E0' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: (stats.automation_rules_total || 0) > 0
                        ? `${((stats.automation_rules_active || 0) / (stats.automation_rules_total || 0)) * 100}%`
                        : '0%',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Recent Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Recent Activities</Text>

            {activities.length > 0 ? (
              <View>
                {activities.slice(0, 5).map((activity, index) => (
                  <ActivityItem key={activity.log_id || index} activity={activity} />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No recent activities</Text>
            )}
          </View>

          {/* Last Update */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </>
      )}
      {!stats && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Unable to load dashboard statistics</Text>
        </View>
      )}
    </ScrollView>
  );
};

// Stat Card Component
const StatCard = ({ title, value, color, icon }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statCardHeader}>
      <MaterialIcons name={icon} size={20} color={color} />
      <Text style={styles.statCardTitle}>{title}</Text>
    </View>
    <Text style={[styles.statCardValue, { color }]}>{value}</Text>
  </View>
);

// Activity Item Component
const ActivityItem = ({ activity }) => {
  const getActionIcon = (action) => {
    switch (action) {
      case 'turn_on':
        return '✓ On';
      case 'turn_off':
        return '✗ Off';
      case 'set_level':
        return '⚡ Level';
      default:
        return action;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityLeft}>
        <Text style={styles.activityTime}>
          {formatTime(activity.timestamp)}
        </Text>
      </View>
      <View style={styles.activityMiddle}>
        <Text style={styles.activityAction}>
          {getActionIcon(activity.action)}
        </Text>
      </View>
      <View style={styles.activityRight}>
        <Text style={styles.activityReason} numberOfLines={1}>
          {activity.reason || 'Device status changed'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#4CAF50',
    height: 8,
  },
  activityItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  activityLeft: {
    flex: 1,
    marginRight: 12,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityMiddle: {
    marginRight: 12,
  },
  activityAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityRight: {
    flex: 2,
  },
  activityReason: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default DashboardScreen;
