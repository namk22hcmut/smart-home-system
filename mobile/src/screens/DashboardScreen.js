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
  Modal,
  FlatList,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';
import realtimeService from '../services/realtime';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';

const DashboardScreen = ({ navigation }) => {
  const route = useRoute();
  const { house: initialHouse } = route.params || {};
  const { token } = useContext(AuthContext);

  // House & Dashboard Data
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [showHouseSelector, setShowHouseSelector] = useState(false);
  
  // Dashboard Data
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sensorChartData, setSensorChartData] = useState(null);
  
  // Filter & Sort
  const [filterType, setFilterType] = useState('all'); // all, turn_on, turn_off, set_level
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, action
  const [dateRange, setDateRange] = useState('today'); // today, week, month
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Load houses on mount
  useEffect(() => {
    loadHouses();
  }, [token]);

  // Load dashboard when house changes
  useEffect(() => {
    if (selectedHouse && selectedHouse.house_id) {
      loadDashboardData(true);
    }
  }, [selectedHouse, filterType, dateRange, sortBy]);

  // Setup real-time connection
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        console.log('🔗 Connecting to real-time server...');
        await realtimeService.connect();
        
        if (token) {
          await realtimeService.authenticate(token);
          await realtimeService.subscribeToRealtimeUpdates(token);
          setRealtimeConnected(true);
          
          realtimeService.onRealtimeUpdate((data) => {
            console.log('📡 Received real-time update:', data);
            if (data.type === 'sensor' || data.type === 'device') {
              loadDashboardData(false);
            }
          });
        }
      } catch (error) {
        console.error('⚠️ Real-time connection failed:', error.message);
      }
    };

    setupRealtime();

    return () => {
      realtimeService.disconnect();
    };
  }, [token]);

  // Load all houses for user
  const loadHouses = async () => {
    try {
      const response = await apiService.get('/houses');
      console.log('🏠 Houses response:', response);
      
      if (response.success && response.houses) {
        setHouses(response.houses);
        
        // Set initial house
        let initialSelected = initialHouse;
        if (!initialSelected && response.houses.length > 0) {
          initialSelected = response.houses[0];
        }
        
        if (initialSelected) {
          setSelectedHouse(initialSelected);
        }
      }
    } catch (error) {
      console.error('❌ Error loading houses:', error);
      Alert.alert('Error', 'Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get date range filter
  const getDateRangeQuery = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }
    
    return startDate.toISOString();
  };

  // Helper: Filter activities
  const filterActivities = (activityList) => {
    let filtered = activityList;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.action === filterType);
    }
    
    return filtered;
  };

  // Helper: Sort activities
  const sortActivities = (activityList) => {
    let sorted = [...activityList];
    
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case 'action':
        sorted.sort((a, b) => (a.action || '').localeCompare(b.action || ''));
        break;
      default:
        break;
    }
    
    return sorted;
  };

  // Load dashboard data for selected house
  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      if (!selectedHouse || !selectedHouse.house_id) return;
      
      const houseId = selectedHouse.house_id || selectedHouse.id;
      console.log('📊 Loading dashboard for house:', houseId);

      // Get stats
      const statsResponse = await apiService.get(`/houses/${houseId}/stats`);
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      // Get activities with filters
      const startDate = getDateRangeQuery();
      const activitiesResponse = await apiService.get(
        `/houses/${houseId}/activity-logs?limit=50&start_date=${startDate}`
      );
      
      if (activitiesResponse.success) {
        let activityList = activitiesResponse.logs || [];
        activityList = filterActivities(activityList);
        activityList = sortActivities(activityList);
        setActivities(activityList);
      }

      // Generate chart data from activities
      generateChartData(activitiesResponse.logs || []);
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Generate chart data from activity logs
  const generateChartData = (activityList) => {
    // Count activities by type
    const actionCounts = {};
    activityList.forEach(log => {
      const action = log.action || 'other';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    const chartLabels = Object.keys(actionCounts).slice(0, 6);
    const chartData = chartLabels.map(label => actionCounts[label]);

    setSensorChartData({
      labels: chartLabels.map(label => label.replace('_', ' ').substring(0, 8)),
      datasets: [{
        data: chartData.length > 0 ? chartData : [0],
      }],
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Render house selector modal
  const renderHouseSelector = () => (
    <Modal
      visible={showHouseSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHouseSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📍 Select House</Text>
            <TouchableOpacity onPress={() => setShowHouseSelector(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={houses}
            keyExtractor={(item) => (item.house_id || item.id).toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.houseOption,
                  selectedHouse?.house_id === item.house_id && styles.houseOptionSelected,
                ]}
                onPress={() => {
                  setSelectedHouse(item);
                  setShowHouseSelector(false);
                }}
              >
                <Text style={styles.houseOptionText}>{item.name || item.house_name}</Text>
                {selectedHouse?.house_id === item.house_id && (
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚙️ Filters & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterScroll}>
            {/* Date Range Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>📅 Date Range</Text>
              {['today', 'week', 'month'].map(range => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.filterOption,
                    dateRange === range && styles.filterOptionActive,
                  ]}
                  onPress={() => setDateRange(range)}
                >
                  <Text style={styles.filterOptionText}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Activity Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>🎯 Activity Type</Text>
              {['all', 'turn_on', 'turn_off', 'set_level'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    filterType === type && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text style={styles.filterOptionText}>
                    {type === 'all' ? 'All Activities' : type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Option */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>↕️ Sort By</Text>
              {['newest', 'oldest', 'action'].map(sort => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterOption,
                    sortBy === sort && styles.filterOptionActive,
                  ]}
                  onPress={() => setSortBy(sort)}
                >
                  <Text style={styles.filterOptionText}>
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!selectedHouse) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No houses available</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with House Selector */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>📊 Dashboard</Text>
              <TouchableOpacity 
                style={styles.houseSelectorButton}
                onPress={() => setShowHouseSelector(true)}
              >
                <Text style={styles.houseSelectorText}>
                  🏠 {selectedHouse?.name || selectedHouse?.house_name || 'Select House'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Filter Button */}
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilters(true)}
            >
              <MaterialIcons name="tune" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
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

            {/* Activity Distribution Chart */}
            {sensorChartData && sensorChartData.datasets[0].data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Activity Distribution</Text>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={sensorChartData}
                    width={screenWidth - 32}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      color: () => '#4CAF50',
                      barPercentage: 0.8,
                    }}
                    style={styles.chart}
                  />
                </View>
              </View>
            )}

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
                  <Text style={styles.statusValue}>
                    {stats.automation_rules_active || 0} / {stats.automation_rules_total || 0}
                  </Text>
                </View>
                <View style={[styles.progressBar, { width: '100%', height: 8 }]}>
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

            {/* Recent Activities with Filter Info */}
            <View style={styles.section}>
              <View style={styles.activityHeader}>
                <Text style={styles.sectionTitle}>📝 Recent Activities</Text>
                <Text style={styles.filterInfo}>
                  {activities.length} {filterType !== 'all' ? '- ' + filterType.replace('_', ' ') : 'total'}
                </Text>
              </View>

              {activities.length > 0 ? (
                <View>
                  {activities.slice(0, 10).map((activity, index) => (
                    <ActivityItem key={activity.log_id || index} activity={activity} />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No activities matching filters</Text>
              )}
            </View>

            {/* Last Update */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
              <Text style={styles.footerText}>
                Date: {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
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

      {/* Modals */}
      {renderHouseSelector()}
      {renderFilterModal()}
    </>
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
    paddingVertical: 16,
    paddingTop: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  houseSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  houseSelectorText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
  },
  filterButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginLeft: 8,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // House Selector
  houseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  houseOptionSelected: {
    backgroundColor: '#F0F7F0',
  },
  houseOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  
  // Filters
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterGroup: {
    marginTop: 16,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  filterOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  
  // Chart
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  
  // Sections
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
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  
  // Stats
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
  
  // Status
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
  
  // Activity
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
  
  // Footer
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default DashboardScreen;
