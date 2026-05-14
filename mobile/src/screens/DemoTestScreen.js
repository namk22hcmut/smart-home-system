/**
 * Demo Test Screen
 * Test device control & sensor data across different rooms
 * Scenarios:
 *   1. Select Room 1 → Random device + sensors → Test control + fetch data
 *   2. Select Room 3 → Random device + sensors → Test control + fetch data
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { adafruitService } from '../services/adafruit';
import { apiService } from '../services/api';
import { theme } from '../styles/theme';

export default function DemoTestScreen({ route }) {
  const { roomId: initialRoomId } = route.params || { roomId: 1 };

  // State
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [randomDevice, setRandomDevice] = useState(null);
  const [randomSensors, setRandomSensors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);

  // 📌 Load data ONLY when user clicks button (on-demand)
  // Removed: useEffect auto-load
  // Old: useEffect(() => { loadRoomData(); }, [selectedRoomId]);

  /**
   * Load random device & sensors for selected room
   */
  const loadRoomData = async () => {
    setLoading(true);
    setTestResults([]);
    try {
      // Get random device
      const device = await adafruitService.getRandomDeviceFromRoom(selectedRoomId);
      setRandomDevice(device);

      // Get random 2 sensors
      const sensors = await adafruitService.getRandomSensorsFromRoom(selectedRoomId, 2);
      setRandomSensors(sensors);

      addResult(`🔄 Loaded Room ${selectedRoomId}: ${device ? 1 : 0} device(s), ${sensors.length} sensor(s)`);
    } catch (error) {
      console.error('Error loading room data:', error);
      addResult(`❌ Error loading room data: ${error.message}`);
    }
    setLoading(false);
  };

  /**
   * Test: Control random device
   */
  const testDeviceControl = async () => {
    if (!randomDevice) {
      Alert.alert('No Device', 'No device selected for this room');
      return;
    }

    setLoading(true);
    try {
      const result = await adafruitService.testDeviceControl(
        randomDevice.device_id,
        0,
        100
      );

      if (result.success) {
        addResult(`✅ ${result.message}`);
      } else {
        addResult(`❌ Control failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Device control error:', error);
      addResult(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  /**
   * Test: Fetch sensor data
   */
  const testSensorDataFetch = async () => {
    if (randomSensors.length === 0) {
      Alert.alert('No Sensors', 'No sensors found in this room');
      return;
    }

    setLoading(true);
    try {
      for (const sensor of randomSensors) {
        const result = await adafruitService.testSensorDataFetch(sensor.id, 20);
        if (result.success) {
          addResult(
            `✅ ${sensor.name}: ${result.latestValue} ${sensor.unit || ''} (${result.dataPoints} points)`
          );
        } else {
          addResult(`❌ ${sensor.name} fetch failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Sensor fetch error:', error);
      addResult(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  /**
   * Switch room and reload
   */
  const switchRoom = (roomId) => {
    setSelectedRoomId(roomId);
  };

  /**
   * Add result to log
   */
  const addResult = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  /**
   * Clear results
   */
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Demo Test - Cross Room</Text>

      {/* Room Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Room</Text>
        <View style={styles.buttonGroup}>
          <Button
            title="Room 1"
            onPress={() => switchRoom(1)}
            color={selectedRoomId === 1 ? '#007AFF' : '#999'}
          />
          <Button
            title="Room 2"
            onPress={() => switchRoom(2)}
            color={selectedRoomId === 2 ? '#007AFF' : '#999'}
          />
          <Button
            title="Room 3"
            onPress={() => switchRoom(3)}
            color={selectedRoomId === 3 ? '#007AFF' : '#999'}
          />
        </View>
        <Text style={styles.info}>Current Room: {selectedRoomId}</Text>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎲 Random Device</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : randomDevice ? (
          <>
            <Text style={styles.info}>
              Device: {randomDevice.device_name}
            </Text>
            <Text style={styles.info}>
              Type: {randomDevice.device_type}
            </Text>
            <Text style={styles.info}>
              Status: {randomDevice.status} | Level: {randomDevice.level}%
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Random Pick"
                onPress={loadRoomData}
                disabled={loading}
              />
              <Button
                title="Test Control"
                onPress={testDeviceControl}
                disabled={loading}
                color="#FF9500"
              />
              <Text style={styles.sectionTitle}>Random Device</Text>
            </View>
          </>
        ) : (
          <Text style={styles.error}>No devices in this room</Text>
        )}
      </View>

      {/* Sensors Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Random Sensors</Text>
          <Text style={styles.sectionTitle}>Random Sensors</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : randomSensors.length > 0 ? (
          <>
            {randomSensors.map((sensor, idx) => (
              <View key={idx} style={styles.sensorItem}>
                <Text style={styles.info}>Name: {sensor.name}</Text>
                <Text style={styles.info}>Type: {sensor.type}</Text>
                <Text style={styles.info}>
                  Latest: {sensor.value || 'N/A'} {sensor.unit || ''}
                </Text>
              </View>
            ))}
            <Button
              title="Fetch Sensor Data"
              onPress={testSensorDataFetch}
              disabled={loading}
              color="#34C759"
            />
          </>
        ) : (
          <Text style={styles.error}>No sensors in this room</Text>
        )}
      </View>

      {/* Test Results Log */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Test Log</Text>
          <Button title="Clear" onPress={clearResults} color="#FF3B30" />
        </View>
        <View style={styles.logContainer}>
          {testResults.length === 0 ? (
            <Text style={styles.logEmpty}>No results yet</Text>
          ) : (
            testResults.map((result, idx) => (
              <Text key={idx} style={styles.logItem}>
                {result}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* Test Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Flow</Text>
        <Text style={styles.instruction}>
          1. Select Room (1, 2, or 3){'\n'}
          2. Click "🎲 Random Pick" to load new device/sensors{'\n'}
          3. Click "📤 Test Control" to send random level (0-100){'\n'}
          4. Click "📡 Fetch Sensor Data" to get latest readings{'\n'}
          5. Check test log for results{'\n'}
          6. Switch to another room and repeat
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  section: {
    backgroundColor: theme.colors.card,
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginVertical: 4,
    color: '#666',
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  sensorItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
    paddingLeft: 12,
    marginVertical: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    maxHeight: 300,
  },
  logItem: {
    fontSize: 12,
    color: '#333',
    marginVertical: 4,
    fontFamily: 'monospace',
  },
  logEmpty: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  instruction: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
