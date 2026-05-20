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
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { theme } from '../styles/theme';

const parseISOToDate = (ts) => {
  if (!ts) return null;
  if (/(Z|[+\-]\d{2}:\d{2})$/.test(ts)) return new Date(ts);
  return new Date(ts + 'Z');
};

const DashboardScreen = ({ navigation }) => {
  const route = useRoute();
  const { house: initialHouse } = route.params || {};
  const { token } = useContext(AuthContext);

  // State
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [showHouseSelector, setShowHouseSelector] = useState(false);
  const [stats, setStats] = useState(null);
  const [deviceUsage, setDeviceUsage] = useState([]);
  const [adafruitSensors, setAdafruitSensors] = useState([]);
  const [sensorChartData, setSensorChartData] = useState(null);
  const [activities, setActivities] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Dashboard',
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.card,
      headerTitleStyle: { fontWeight: '700', color: theme.colors.card },
    });
  }, [navigation]);

  useEffect(() => {
    loadHouses();
  }, [token]);

  useEffect(() => {
    if (selectedHouse?.house_id) {
      loadDashboardData(true);
    }
  }, [selectedHouse]);

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        await realtimeService.connect();
        if (token) {
          await realtimeService.authenticate(token);
          await realtimeService.subscribeToRealtimeUpdates(token);
          setRealtimeConnected(true);
          realtimeService.onRealtimeUpdate((data) => {
            if (data.type === 'sensor' || data.type === 'device') {
              loadDashboardData(false);
            }
          });
        }
      } catch (error) {
        console.error('Realtime connection error:', error.message);
      }
    };
    setupRealtime();
    return () => realtimeService.disconnect();
  }, [token]);

  const loadHouses = async () => {
    try {
      const response = await apiService.get('/houses');
      if (response.success && response.data) {
        const housesData = response.data.map(h => ({
          house_id: h.id,
          name: h.name,
          house_name: h.name,
          address: h.address,
        }));
        setHouses(housesData);
        if (initialHouse) {
          setSelectedHouse(initialHouse);
        } else if (housesData.length > 0) {
          setSelectedHouse(housesData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading houses:', error);
      Alert.alert('Error', 'Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      if (!selectedHouse?.house_id) return;

      const houseId = selectedHouse.house_id;
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // Get stats
      const statsRes = await apiService.get(`/houses/${houseId}/stats?start_date=${startDate.toISOString()}`);
      if (statsRes.success) setStats(statsRes.stats);

      // Fetch aggregated per-device usage for the house in a single request
      try {
        const dateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD UTC
        const houseUsage = await apiService.get(`/houses/${houseId}/device-usage-day?date=${dateStr}`);
        if (houseUsage && houseUsage.success && Array.isArray(houseUsage.devices)) {
          // Map to expected deviceUsage structure
          const mapped = houseUsage.devices.map(d => ({
            device_id: d.device_id,
            device_name: d.device_name,
            device_type: d.device_type,
            status: d.status,
            usage_minutes: d.usage_minutes,
            usage_hours: d.usage_hours,
            usage_display: `${Math.floor(d.usage_minutes/60)}h ${Math.floor(d.usage_minutes%60)}m`
          }));
          setDeviceUsage(mapped.sort((a,b) => b.usage_hours - a.usage_hours));
        } else {
          console.warn('House usage-day returned unexpected shape', houseUsage);
        }
      } catch (err) {
        console.error('Error fetching house device-usage-day:', err.message || err);
      }

      // Get activities
      const actRes = await apiService.get(`/houses/${houseId}/activity-logs?limit=20&start_date=${startDate.toISOString()}`);
      if (actRes.success) setActivities(actRes.logs || []);

      // Load sensor data
      await loadSensorData();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadSensorData = async () => {
    try {
      if (!selectedHouse?.house_id) return;
      const sensorData = await adafruitService.getAllSensorData(selectedHouse.house_id);
      
      if (sensorData.success || (sensorData.temperature || sensorData.humidity)) {
        const sensors = [];
        if (sensorData.temperature?.success && sensorData.temperature?.chartData) {
          sensors.push({
            name: 'Temperature',
            feed_key: 'temperature',
            latestValue: sensorData.temperature.latestValue,
            chartData: sensorData.temperature.chartData,
          });
        }
        if (sensorData.humidity?.success && sensorData.humidity?.chartData) {
          sensors.push({
            name: 'Humidity',
            feed_key: 'humidity',
            latestValue: sensorData.humidity.latestValue,
            chartData: sensorData.humidity.chartData,
          });
        }
        setAdafruitSensors(sensors);
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    }
  };

  // Build cleaned chart data for a given sensor (returns null if not suitable)
  const buildChartData = (sensor) => {
    if (!sensor?.chartData?.labels || !sensor?.chartData?.values) return null;

    const rawValues = sensor.chartData.values.slice(0, 24);
    const cleanValues = rawValues.map(v => {
      const parsed = parseFloat(v);
      return (isFinite(parsed) && !isNaN(parsed)) ? parsed : 0;
    });

    if (!cleanValues.some(v => v > 0)) return null;

    const allLabels = sensor.chartData.labels.slice(0, 24);
    const displayLabels = allLabels.map((label, i) => (i % 3 === 0 ? label : ''));

    return {
      labels: displayLabels,
      datasets: [{ data: cleanValues }],
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(false);
    setRefreshing(false);
  };

  const renderDeviceUsageChart = () => {
    if (!deviceUsage.length) return null;

    // Show top 5 devices only
    const topDevices = deviceUsage.slice(0, 5);
    const chartData = {
      labels: topDevices.map(d => d.device_name.substring(0, 10)),
      datasets: [{
        data: topDevices.map(d => parseFloat(d.usage_hours) || 0),
      }],
    };

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="schedule" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Device Usage Today</Text>
        </View>
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={screenWidth - 32}
            height={240}
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              color: () => '#2196F3',
              barPercentage: 0.6,
              propsForLabels: {
                fontSize: 11,
              },
            }}
            style={styles.chart}
          />
        </View>
        <View style={styles.usageList}>
          {deviceUsage.map((device, idx) => (
            <DeviceUsageRow key={idx} device={device} />
          ))}
        </View>
      </View>
    );
  };

  const renderSensorSection = () => {
    if (!adafruitSensors.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="thermostat" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Live Sensor Data</Text>
        </View>
        
        {/* Sensor Values */}
        <View style={styles.sensorValuesRow}>
          {adafruitSensors.map((sensor, idx) => (
            <SensorValueCard key={idx} sensor={sensor} />
          ))}
        </View>

        {/* Sensor Charts - render one chart per sensor with valid data */}
        {adafruitSensors.map((sensor, idx) => {
          const data = buildChartData(sensor);
          if (!data) return null;
          const color = sensor.feed_key === 'humidity' ? '#2196F3' : '#FF9800';
          return (
            <View key={idx} style={styles.chartContainer}>
              <LineChart
                data={data}
                width={screenWidth - 32}
                height={200}
                chartConfig={{
                  backgroundColor: theme.colors.card,
                  backgroundGradientFrom: theme.colors.card,
                  backgroundGradientTo: theme.colors.card,
                  color: () => color,
                  strokeWidth: 2,
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                style={styles.chart}
                bezier
              />
            </View>
          );
        })}
      </View>
    );
  };

  const renderOverviewStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="info" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>System Overview</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox
            icon="power"
            label="Devices On"
            value={stats.devices_on || 0}
            color="#4CAF50"
          />
          <StatBox
            icon="power-off"
            label="Devices Off"
            value={(stats.total_devices || 0) - (stats.devices_on || 0)}
            color="#FF5252"
          />
          <StatBox
            icon="bolt"
            label="Automation Runs"
            value={stats.automation_run_count || 0}
            color="#FFB74D"
          />
          <StatBox
            icon="warning"
            label="Alerts"
            value={stats.threshold_alert_count || 0}
            color="#FF6B6B"
          />
        </View>
      </View>
    );
  };

  const renderActivityTimeline = () => {
    if (!activities.length) return null;

    const recentActivities = activities.slice(0, 10);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="history" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        
        <View style={styles.timelineContainer}>
          {recentActivities.map((activity, idx) => (
            <ActivityTimelineItem key={idx} activity={activity} />
          ))}
        </View>
      </View>
    );
  };

  const renderHouseSelector = () => (
    <Modal visible={showHouseSelector} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select House</Text>
            <TouchableOpacity onPress={() => setShowHouseSelector(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {houses.map((house, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.houseOption,
                  selectedHouse?.house_id === house.house_id && styles.houseOptionActive,
                ]}
                onPress={() => {
                  setSelectedHouse(house);
                  setShowHouseSelector(false);
                }}
              >
                <View>
                  <Text style={styles.houseOptionName}>{house.name}</Text>
                  <Text style={styles.houseOptionAddress}>{house.address}</Text>
                </View>
                {selectedHouse?.house_id === house.house_id && (
                  <MaterialIcons name="check" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.houseSelectorButton}
          onPress={() => setShowHouseSelector(true)}
        >
          <MaterialIcons name="home" size={20} color={theme.colors.primary} />
          <Text style={styles.houseSelectorText}>{selectedHouse?.name || 'Select House'}</Text>
          <MaterialIcons name="expand-more" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <MaterialIcons
            name="refresh"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {stats ? (
          <>
            {renderOverviewStats()}
            {renderDeviceUsageChart()}
            {renderSensorSection()}
            {renderActivityTimeline()}
            <View style={styles.spacer} />
          </>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        )}
      </ScrollView>

      {renderHouseSelector()}
    </>
  );
};

// Components
const StatBox = ({ icon, label, value, color }) => (
  <View style={[styles.statBox, { borderLeftColor: color }]}>
    <MaterialIcons name={icon} size={28} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DeviceUsageRow = ({ device }) => (
  <View style={styles.usageRow}>
    <View style={styles.usageRowLeft}>
      <Text style={styles.usageDeviceName}>{device.device_name}</Text>
      <Text style={styles.usageDeviceType}>{device.device_type}</Text>
    </View>
    <View style={styles.usageRowRight}>
      <Text style={[
        styles.usageValue,
        device.status === 'on' && styles.usageValueActive
      ]}>
        {device.usage_display}
      </Text>
      <Text style={[
        styles.statusBadge,
        device.status === 'on' ? styles.statusOn : styles.statusOff
      ]}>
        {device.status === 'on' ? '● On' : '● Off'}
      </Text>
    </View>
  </View>
);

const SensorValueCard = ({ sensor }) => (
  <View style={styles.sensorCard}>
    <Text style={styles.sensorName}>{sensor.name}</Text>
    <Text style={styles.sensorValue}>
      {sensor.latestValue?.toFixed(1) || '—'}
      <Text style={styles.sensorUnit}>{sensor.feed_key === 'humidity' ? '%' : '°'}</Text>
    </Text>
  </View>
);

const ActivityTimelineItem = ({ activity }) => {
  const formatTime = (ts) => {
    const date = parseISOToDate(ts) || new Date(ts);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleTimeString();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'turn_on': return '#4CAF50';
      case 'turn_off': return '#FF5252';
      case 'set_level': return '#2196F3';
      default: return '#757575';
    }
  };

  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineMarker, { backgroundColor: getActionColor(activity.action) }]} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineAction}>{activity.action}</Text>
        <Text style={styles.timelineReason} numberOfLines={1}>{activity.reason || 'Device updated'}</Text>
        <Text style={styles.timelineTime}>{formatTime(activity.timestamp)}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  houseSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  houseSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginHorizontal: 6,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 10,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray1,
    marginTop: 4,
    textAlign: 'center',
  },

  // Charts
  chartContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 8,
    marginVertical: 12,
    elevation: 2,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },

  // Device Usage
  usageList: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  usageRowLeft: {
    flex: 1,
  },
  usageRowRight: {
    alignItems: 'flex-end',
  },
  usageDeviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  usageDeviceType: {
    fontSize: 12,
    color: theme.colors.gray1,
    marginTop: 2,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  usageValueActive: {
    color: '#4CAF50',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  statusOn: {
    color: '#4CAF50',
  },
  statusOff: {
    color: '#FF5252',
  },

  // Sensors
  sensorValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  sensorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  sensorName: {
    fontSize: 12,
    color: theme.colors.gray1,
    marginBottom: 8,
  },
  sensorValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sensorUnit: {
    fontSize: 16,
  },

  // Timeline
  timelineContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  timelineMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  timelineReason: {
    fontSize: 12,
    color: theme.colors.gray1,
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: theme.colors.gray2,
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
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
  houseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  houseOptionActive: {
    backgroundColor: theme.colors.background,
  },
  houseOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  houseOptionAddress: {
    fontSize: 12,
    color: theme.colors.gray1,
    marginTop: 4,
  },

  // Other
  loadingText: {
    fontSize: 14,
    color: theme.colors.gray1,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.gray1,
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
});

export default DashboardScreen;
