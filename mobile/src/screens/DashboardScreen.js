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
import adafruitService from '../services/adafruit';
import realtimeService from '../services/realtime';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { theme } from '../styles/theme';

// Helper: parse ISO timestamp safely (append Z if naive timestamp)
const parseISOToDate = (ts) => {
  if (!ts) return null;
  if (/(Z|[+\-]\d{2}:\d{2})$/.test(ts)) return new Date(ts);
  return new Date(ts + 'Z');
};

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
  const [deviceUsage, setDeviceUsage] = useState([]);
  
  // Adafruit Sensor Data for Visualization
  const [adafruitSensors, setAdafruitSensors] = useState([]);
  const [selectedSensorForChart, setSelectedSensorForChart] = useState(null);
  const [sensorChartDataAdafruit, setSensorChartDataAdafruit] = useState({});
  const [loadingAdafruitData, setLoadingAdafruitData] = useState(false);
  
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Dashboard',
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.card,
      headerTitleStyle: {
        fontWeight: '700',
        color: theme.colors.card,
      },
    });
  }, [navigation]);

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
      
      if (response.success && response.data) {
        // Map backend data to match expected format
        const housesData = response.data.map(h => ({
          house_id: h.id,
          name: h.name,
          house_name: h.name,
          address: h.address,
          floors: h.floors
        }));
        
        setHouses(housesData);
        console.log('✅ Loaded houses:', housesData.length);
        
        // Set initial house
        let initialSelected = initialHouse;
        if (!initialSelected && housesData.length > 0) {
          initialSelected = housesData[0];
        }
        
        if (initialSelected) {
          setSelectedHouse(initialSelected);
        }
      } else {
        console.warn('⚠️ No houses in response:', response);
        Alert.alert('No Houses', 'You don\'t have any houses yet. Create one first.');
      }
    } catch (error) {
      console.error('❌ Error loading houses:', error);
      Alert.alert('Error', 'Failed to load houses: ' + error.message);
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
      const startDate = getDateRangeQuery();

      // Get stats
      const statsResponse = await apiService.get(`/houses/${houseId}/stats?start_date=${startDate}`);
      
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      // Get device usage data
      const usageResponse = await apiService.get(`/houses/${houseId}/device-usage?period=today`);
      if (usageResponse.success) {
        setDeviceUsage(usageResponse.devices || []);
      }

      // Get activities with filters
      const activitiesResponse = await apiService.get(
        `/houses/${houseId}/activity-logs?limit=50&start_date=${startDate}`
      );
      
      if (activitiesResponse.success) {
        let activityList = activitiesResponse.logs || [];
        activityList = filterActivities(activityList);
        activityList = sortActivities(activityList);
        setActivities(activityList);
      }

      // Generate chart data from activities and stats
      generateChartData(activitiesResponse.logs || [], statsResponse.stats || {});
      
      // 📌 REMOVED: Auto-fetch Adafruit sensor data
      // Now: Only fetch on-demand (user clicks sensor tab or refresh)
      // await loadAdafruitSensorData();
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Load Adafruit sensor data for the selected house (ON-DEMAND ONLY)
  // Called when:
  //   1. User clicks 🔄 refresh button
  //   2. Real-time Socket.IO update from server
  // Never called automatically on mount/filter change!
  const loadAdafruitSensorData = async () => {
    setLoadingAdafruitData(true);
    try {
      // Fetch both temperature and humidity from Adafruit
      const sensorData = await adafruitService.getAllSensorData();
      
      if (sensorData.success) {
        // Setup sensors list
        const sensors = [];
        
        if (sensorData.temperature?.success) {
          sensors.push({
            name: 'Temperature',
            feed_key: 'temperature',
            latestValue: sensorData.temperature.latestValue,
            chartData: sensorData.temperature.chartData,
          });
        }
        
        if (sensorData.humidity?.success) {
          sensors.push({
            name: 'Humidity',
            feed_key: 'humidity',
            latestValue: sensorData.humidity.latestValue,
            chartData: sensorData.humidity.chartData,
          });
        }
        
        setAdafruitSensors(sensors);
        
        // Setup chart data
        const chartDataMap = {};
        if (sensorData.temperature?.chartData) {
          chartDataMap['temperature'] = sensorData.temperature.chartData;
        }
        if (sensorData.humidity?.chartData) {
          chartDataMap['humidity'] = sensorData.humidity.chartData;
        }
        setSensorChartDataAdafruit(chartDataMap);
        
        // Select first sensor for display
        if (sensors.length > 0) {
          setSelectedSensorForChart(sensors[0]);
        }
        
        console.log(`✅ Loaded ${sensors.length} sensors from Adafruit`);
      }
    } catch (error) {
      console.error('❌ Error loading Adafruit data:', error.message);
    } finally {
      setLoadingAdafruitData(false);
    }
  };

  // Update chart when different sensor is selected
  const handleSensorSelection = async (sensor) => {
    setSelectedSensorForChart(sensor);
    
    // If chart data not loaded yet, fetch it
    if (!sensorChartDataAdafruit[sensor.feed_key]) {
      try {
        if (sensor.feed_key === 'temperature') {
          const result = await adafruitService.getTemperatureData(48);
          if (result.success) {
            setSensorChartDataAdafruit(prev => ({
              ...prev,
              [sensor.feed_key]: result.chartData,
            }));
          }
        } else if (sensor.feed_key === 'humidity') {
          const result = await adafruitService.getHumidityData(48);
          if (result.success) {
            setSensorChartDataAdafruit(prev => ({
              ...prev,
              [sensor.feed_key]: result.chartData,
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error loading chart data:', error.message);
      }
    }
  };

  // Generate chart data from activity logs
  const generateChartData = (activityList, dashboardStats = {}) => {
    // Count activity by hour
    const hourlyData = Array(24).fill(0);
    activityList.forEach((log) => {
      if (log.timestamp) {
        const d = parseISOToDate(log.timestamp) || new Date(log.timestamp);
        const hour = d.getHours();
        hourlyData[hour]++;
      }
    });

    // Get top 5 active devices
    const deviceCounts = {};
    activityList.forEach((log) => {
      const deviceId = log.device_id;
      deviceCounts[deviceId] = (deviceCounts[deviceId] || 0) + 1;
    });

    const topDevices = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Create hourly labels - show every 3rd hour to avoid crowding
    const hourlyLabels = Array.from({ length: 24 }, (_, i) => i % 3 === 0 ? `${i}h` : '');

    // Build device names map from activity logs
    const deviceNamesMap = {};
    activityList.forEach((log) => {
      if (log.device_name && !deviceNamesMap[log.device_id]) {
        deviceNamesMap[log.device_id] = log.device_name;
      }
    });

    setSensorChartData({
      hourly: {
        labels: hourlyLabels,
        datasets: [{
          data: hourlyData,
        }],
      },
      topDevices: topDevices.length > 0 
        ? {
            labels: topDevices.map(([deviceId]) => deviceNamesMap[deviceId] || `Device ${deviceId}`),
            datasets: [{
              data: topDevices.map(d => d[1]),
            }],
          }
        : null,
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = parseISOToDate(timestamp);
    return date ? date.toLocaleString() : 'N/A';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const onOffActivities = activities.filter((activity) => ['turn_on', 'turn_off'].includes(activity.action));
  const automationActivities = activities.filter((activity) => activity.triggered_by === 'automation_rule');

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
            <Text style={styles.modalTitle}>Select House</Text>
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
            <Text style={styles.modalTitle}>Filters & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterScroll}>
            {/* Date Range Filter */}
            <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Date Range</Text>
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
              <Text style={styles.filterLabel}>Activity Type</Text>
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <View style={styles.contentHeader}>
          <TouchableOpacity
            style={styles.houseSelectorButton}
            onPress={() => setShowHouseSelector(true)}
          >
            <Text style={styles.houseSelectorText}>
              {selectedHouse?.name || selectedHouse?.house_name || 'Select House'}
            </Text>
            <MaterialIcons name="expand-more" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <MaterialIcons name="tune" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {stats && (
          <>
            {/* Device Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Device Activity</Text>
              <View style={styles.sectionSubtitleRow}>
                <Text style={styles.sectionSubtitle}>Bật/tắt thiết bị và thời điểm gần nhất</Text>
                <Text style={styles.filterInfo}>{onOffActivities.length} events</Text>
              </View>

              <View style={[styles.statsGrid, styles.centerStatsGrid]}>
                <View style={styles.statsPair}>
                  <View style={{ marginRight: 12 }}>
                    <StatCard
                      title="Turn On"
                      value={stats.turn_on_count || 0}
                      color="#29B6F6"
                      icon="power"
                    />
                  </View>

                  <View>
                    <StatCard
                      title="Turn Off"
                      value={stats.turn_off_count || 0}
                      color="#FFA726"
                      icon="power-off"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.switchSummary}>
                <View style={styles.switchSummaryRow}>
                  <Text style={styles.switchSummaryLabel}>Last Turn On</Text>
                  <Text style={styles.switchSummaryValue}>{formatTimestamp(stats.last_turn_on_at)}</Text>
                </View>
                <View style={styles.switchSummaryRow}>
                  <Text style={styles.switchSummaryLabel}>Last Turn Off</Text>
                  <Text style={styles.switchSummaryValue}>{formatTimestamp(stats.last_turn_off_at)}</Text>
                </View>
              </View>

              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>On/Off Timeline</Text>
                {onOffActivities.length > 0 ? (
                  <View>
                    {onOffActivities.slice(0, 8).map((activity, index) => (
                      <ActivityItem key={activity.log_id || index} activity={activity} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No on/off events found</Text>
                )}
              </View>
            </View>

            {/* Automation Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Automation Activity</Text>
              <View style={styles.sectionSubtitleRow}>
                <Text style={styles.sectionSubtitle}>Ngưỡng cảnh báo và automation tự chạy</Text>
                <Text style={styles.filterInfo}>{automationActivities.length} automation logs</Text>
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  title="Threshold Alerts"
                  value={stats.threshold_alert_count || 0}
                  color="#FF5252"
                  icon="warning"
                />
                <StatCard
                  title="Automation Runs"
                  value={stats.automation_run_count || 0}
                  color="#4CAF50"
                  icon="bolt"
                />
                <StatCard
                  title="Active Rules"
                  value={`${stats.automation_rules_active || 0}/${stats.automation_rules_total || 0}`}
                  color="#FFB74D"
                  icon="rule"
                />
                <StatCard
                  title="Threshold + Auto"
                  value={(stats.threshold_alert_count || 0) + (stats.automation_run_count || 0)}
                  color="#AB47BC"
                  icon="analytics"
                />
              </View>

              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>Automation Timeline</Text>
                {automationActivities.length > 0 ? (
                  <View>
                    {automationActivities.slice(0, 8).map((activity, index) => (
                      <ActivityItem key={activity.log_id || index} activity={activity} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No automation-triggered events found</Text>
                )}
              </View>
            </View>

            {/* Devices Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Device Status</Text>

              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Devices"
                  value={stats.total_devices || 0}
                  color="#FF6B6B"
                  icon="devices"
                />
                <StatCard
                  title="Turned On"
                  value={stats.devices_on || 0}
                  color="#29B6F6"
                  icon="power-settings-new"
                />
              </View>
            </View>

            {/* Device Usage Today */}
            {deviceUsage.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Device Usage Today</Text>
                
                <View style={styles.usageList}>
                  {deviceUsage.map((device, idx) => (
                    <View key={idx} style={styles.usageItem}>
                      <View style={styles.usageLeft}>
                        <Text style={styles.usageDeviceName}>{device.device_name}</Text>
                        <Text style={styles.usageDeviceType}>{device.device_type}</Text>
                      </View>
                      <View style={styles.usageRight}>
                        <Text style={[
                          styles.usageTime,
                          device.status === 'on' && styles.usageTimeActive
                        ]}>
                          {device.usage_display}
                        </Text>
                        <Text style={[
                          styles.usageStatus,
                          device.status === 'on' ? styles.statusOn : styles.statusOff
                        ]}>
                          {device.status === 'on' ? '● On' : '● Off'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Adafruit Sensor Data Visualization */}
            {adafruitSensors.length > 0 && (
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionTitle}>Live Sensor Trends</Text>
                  <TouchableOpacity 
                    onPress={loadAdafruitSensorData}
                    disabled={loadingAdafruitData}
                    style={{ padding: 8 }}
                  >
                    <MaterialIcons name="refresh" size={18} color={theme.colors.card} />
                  </TouchableOpacity>
                </View>
                
                {/* Sensor Selection */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sensorSelector}
                >
                  {adafruitSensors.map((sensor, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.sensorTab,
                        selectedSensorForChart?.feed_key === sensor.feed_key &&
                          styles.sensorTabActive,
                      ]}
                      onPress={() => handleSensorSelection(sensor)}
                    >
                      <Text
                        style={[
                          styles.sensorTabText,
                          selectedSensorForChart?.feed_key === sensor.feed_key &&
                            styles.sensorTabTextActive,
                        ]}
                      >
                        {sensor.feed_name?.split('/').pop() || sensor.feed_key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Chart */}
                {selectedSensorForChart && sensorChartDataAdafruit[selectedSensorForChart.feed_key] && (
                  <View style={styles.chartContainer}>
                    <LineChart
                      data={{
                        labels: sensorChartDataAdafruit[selectedSensorForChart.feed_key].labels,
                        datasets: [
                          {
                            data: sensorChartDataAdafruit[selectedSensorForChart.feed_key].values,
                          },
                        ],
                      }}
                      width={screenWidth - 32}
                      height={220}
                      chartConfig={{
                        backgroundColor: theme.colors.card,
                        backgroundGradientFrom: theme.colors.card,
                        backgroundGradientTo: theme.colors.card,
                        color: () => '#2196F3',
                        strokeWidth: 2,
                      }}
                      style={styles.chart}
                    />
                  </View>
                )}

                {loadingAdafruitData && (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading sensor data...</Text>
                  </View>
                )}
              </View>
            )}

            {/* Activity Overview Charts */}
            {sensorChartData && (
              <>
                {/* Hourly Activity Distribution */}
                {sensorChartData.hourly && sensorChartData.hourly.datasets[0].data.some(v => v > 0) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⏰ Hourly Activity Distribution</Text>
                    <Text style={styles.sectionSubtitle}>Activity count by hour</Text>
                    <View style={styles.chartContainer}>
                      <LineChart
                        data={sensorChartData.hourly}
                        width={screenWidth - 32}
                        height={260}
                        chartConfig={{
                          backgroundColor: theme.colors.card,
                          backgroundGradientFrom: theme.colors.card,
                          backgroundGradientTo: theme.colors.card,
                          color: () => '#29B6F6',
                          strokeWidth: 2,
                          useShadowColorFromDataset: false,
                        }}
                        style={styles.chart}
                        bezier
                      />
                    </View>
                  </View>
                )}

                {/* Top Active Devices */}
                {sensorChartData.topDevices && sensorChartData.topDevices.datasets[0].data.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Top Active Devices</Text>
                    <Text style={styles.sectionSubtitle}>Most used devices</Text>
                    <View style={styles.chartContainer}>
                      <BarChart
                        data={sensorChartData.topDevices}
                        width={screenWidth - 32}
                        height={280}
                        chartConfig={{
                          backgroundColor: theme.colors.card,
                          backgroundGradientFrom: theme.colors.card,
                          backgroundGradientTo: theme.colors.card,
                          color: () => '#FFA726',
                          barPercentage: 0.7,
                        }}
                        style={styles.chart}
                      />
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Infrastructure Stats */}
            <View style={styles.section}>
<Text style={styles.sectionTitle}>Infrastructure</Text>

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
          return 'ON';
      case 'turn_off':
          return 'OFF';
      case 'set_level':
          return 'LEVEL';
      default:
        return action;
    }
  };

  const formatTime = (timestamp) => {
    const date = parseISOToDate(timestamp) || new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date ? date.toLocaleString() : 'N/A';
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
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    display: 'none',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  houseSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  houseSelectorText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
    fontWeight: '700',
  },
  filterButton: {
    padding: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
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
    borderBottomColor: theme.colors.gray2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  
  // House Selector
  houseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  houseOptionSelected: {
    backgroundColor: theme.colors.background,
  },
  houseOptionText: {
    fontSize: 16,
    color: theme.colors.text,
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
    color: theme.colors.text,
    marginBottom: 12,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray2,
  },
  filterOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary,
  },
  
  // Chart
  chartContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  timelineCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  
  // Sensor Selector
  sensorSelector: {
    marginBottom: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  sensorTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray2,
  },
  sensorTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sensorTabText: {
    fontSize: 12,
    color: theme.colors.gray1,
    fontWeight: '500',
  },
  sensorTabTextActive: {
    color: theme.colors.card,
  },
  
  // Sections
  section: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionSubtitle: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.gray1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterInfo: {
    fontSize: 12,
    color: theme.colors.gray2,
    fontStyle: 'italic',
  },
  
  // Stats
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  centerStatsGrid: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsPair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
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
    color: theme.colors.gray1,
    marginLeft: 6,
    flex: 1,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  switchSummary: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    elevation: 2,
  },
  switchSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchSummaryLabel: {
    fontSize: 13,
    color: theme.colors.gray1,
    fontWeight: '600',
    marginRight: 12,
  },
  switchSummaryValue: {
    fontSize: 12,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  
  // Status
  statusContainer: {
    backgroundColor: theme.colors.card,
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
    color: theme.colors.gray1,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    backgroundColor: theme.colors.gray2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: theme.colors.primary,
    height: 8,
  },
  
  // Activity
  activityItem: {
    backgroundColor: theme.colors.card,
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
    color: theme.colors.gray2,
  },
  activityMiddle: {
    marginRight: 12,
  },
  activityAction: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityRight: {
    flex: 2,
  },
  activityReason: {
    fontSize: 12,
    color: theme.colors.gray1,
  },
  
  // Device Usage
  usageList: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  usageLeft: {
    flex: 1,
  },
  usageDeviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  usageDeviceType: {
    fontSize: 12,
    color: theme.colors.gray2,
  },
  usageRight: {
    alignItems: 'flex-end',
  },
  usageTime: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.gray1,
    marginBottom: 4,
  },
  usageTimeActive: {
    color: theme.colors.primary,
  },
  usageStatus: {
    fontSize: 11,
    color: theme.colors.gray2,
  },
  statusOn: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  statusOff: {
    color: theme.colors.gray2,
  },
  
  // Footer
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.gray2,
    marginBottom: 4,
  },
  
  emptyText: {
    textAlign: 'center',
    color: theme.colors.gray2,
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default DashboardScreen;
