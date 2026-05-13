/**
 * UserSensorsScreen.js - User Sensor Management
 * Allow users to create, edit, delete sensors in their room
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';
import adafruitService from '../services/adafruit';

export default function UserSensorsScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
  const isMounted = useRef(true);
  
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFeeds, setUpdatingFeeds] = useState({});  // Track which feeds are updating
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [formData, setFormData] = useState({
    sensor_name: '',
    sensor_type: 'temperature',
  });

  const sensorTypes = ['temperature', 'humidity', 'motion', 'light', 'co2', 'pressure', 'other'];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load sensors
  const loadSensors = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get(`/rooms/${roomId}/sensors`);
      console.log('📊 Sensors API response:', response);
      if (response && response.success) {
        setSensors(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'sensors:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading sensors:', error);
      Alert.alert('Error', 'Failed to load sensors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create new sensor
  const createSensor = async () => {
    if (!formData.sensor_name.trim()) {
      Alert.alert('Error', 'Please enter sensor name');
      return;
    }

    try {
      const response = await apiService.post('/sensors', {
        room_id: roomId,
        sensor_name: formData.sensor_name.trim(),
        sensor_type: formData.sensor_type,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Sensor added!');
        resetForm();
        loadSensors(false);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create sensor');
    }
  };

  // Update sensor
  const updateSensor = async () => {
    if (!formData.sensor_name.trim()) {
      Alert.alert('Error', 'Please enter sensor name');
      return;
    }

    try {
      console.log('📤 Updating sensor:', editingSensor.id, 'with data:', formData);
      const response = await apiService.put(`/sensors/${editingSensor.id}`, {
        sensor_name: formData.sensor_name,
        sensor_type: formData.sensor_type,
      });

      console.log('📥 Update response:', response);
      if (response && response.success) {
        Alert.alert('Success', 'Sensor updated!');
        resetForm();
        loadSensors(false);
      } else {
        Alert.alert('Error', response?.error || 'Failed to update sensor');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to update sensor');
    }
  };

  // Delete sensor
  const deleteSensor = async (sensorId) => {
    Alert.alert(
      'Delete Sensor',
      'Delete this sensor?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/sensors/${sensorId}`);
              if (response && response.success) {
                Alert.alert('Success', 'Sensor deleted!');
                loadSensors(false);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete sensor');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // 🔥 Update sensor data from Adafruit
  const updateFromAdafruit = async (sensor) => {
    try {
      console.log('🔄 [UPDATE START] Sensor:', sensor);
      setUpdatingFeeds(prev => ({ ...prev, [sensor.id]: true }));
      
      console.log(`🔄 [UPDATE] Updating ${sensor.name} from Adafruit (sensor_id: ${sensor.id})`);
      
      if (!adafruitService) {
        console.error('❌ adafruitService is NULL');
        Alert.alert('Error', 'Service not initialized');
        return;
      }
      
      if (!adafruitService.fetchLiveData) {
        console.error('❌ fetchLiveData method not found on adafruitService');
        Alert.alert('Error', 'fetchLiveData method not available');
        return;
      }
      
      console.log(`🔄 [UPDATE] Calling adafruitService.fetchLiveData(${sensor.id})`);
      const result = await adafruitService.fetchLiveData(sensor.id);
      
      console.log(`🔄 [UPDATE] API Response:`, result);
      
      if (result.success) {
        console.log(`✅ [UPDATE] Success! New value:`, result.data);
        Alert.alert('Success', `✅ Updated: ${sensor.name} = ${result.data.value}`);
        // Reload sensors to show updated value
        console.log(`🔄 [UPDATE] Reloading sensors...`);
        await loadSensors(false);
      } else {
        console.error(`❌ [UPDATE] API failed:`, result.error);
        Alert.alert('Error', `Failed to update from Adafruit: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [UPDATE] Exception:', error.message);
      console.error('❌ [UPDATE] Stack:', error);
      Alert.alert('Error', error.message || 'Failed to update from Adafruit');
    } finally {
      console.log(`🔄 [UPDATE] Setting updating to false for sensor ${sensor.id}`);
      setUpdatingFeeds(prev => ({ ...prev, [sensor.id]: false }));
    }
  };

  // Open add sensor modal
  const openAddModal = () => {
    setEditingSensor(null);
    setFormData({ sensor_name: '', sensor_type: 'temperature' });
    setModalVisible(true);
  };

  // Open edit sensor modal
  const openEditModal = (sensor) => {
    console.log('🔍 Edit sensor object:', sensor);
    setEditingSensor(sensor);
    setFormData({
      sensor_name: sensor.name || '',
      sensor_type: sensor.type || 'temperature',
    });
    console.log('✏️ Form data set to:', {
      sensor_name: sensor.name || '',
      sensor_type: sensor.type || 'temperature',
    });
    setModalVisible(true);
  };

  // Reset form
  const resetForm = () => {
    console.log('🔄 Resetting form...');
    setFormData({ sensor_name: '', sensor_type: 'temperature' });
    setEditingSensor(null);
    setModalVisible(false);
  };

  // Initial load
  useEffect(() => {
    loadSensors();
  }, []);

  // Track when editing sensor changes
  useEffect(() => {
    if (editingSensor) {
      console.log('🔄 editingSensor changed:', editingSensor);
      const newFormData = {
        sensor_name: editingSensor.name || '',
        sensor_type: editingSensor.type || 'temperature',
      };
      console.log('📝 Setting formData to:', newFormData);
      setFormData(newFormData);
    }
  }, [editingSensor]);

  // Get sensor type display with icon
  const getSensorTypeDisplay = (type) => {
    const types = {
      temperature: '🌡️ Temperature',
      humidity: '💧 Humidity',
      motion: '🚨 Motion',
      light: '💡 Light',
      co2: '🌫️ CO2',
      pressure: '🔰 Pressure',
      other: '📊 Other',
    };
    return types[type] || type;
  };

  // Render sensor item
  const renderSensorItem = ({ item }) => {
    console.log('🎨 Rendering sensor:', item);
    const isUpdating = updatingFeeds[item.id];
    
    return (
      <View style={styles.sensorCard}>
        <View style={styles.sensorHeader}>
          <View style={styles.sensorInfo}>
            <Text style={styles.sensorType}>{getSensorTypeDisplay(item.type || 'other')}</Text>
            <Text style={styles.sensorName}>📝 {item.name || 'Unknown'}</Text>
            {item.value !== null && item.value !== undefined ? (
              <Text style={styles.sensorValue}>
                📊 Value: {Number(item.value).toFixed(1)} {item.unit}
              </Text>
            ) : (
              <Text style={styles.sensorNoValue}>No data yet</Text>
            )}
          </View>
          <View style={styles.sensorActions}>
            <TouchableOpacity
              style={[styles.updateBtn, isUpdating && styles.updateBtnLoading]}
              onPress={() => {
                console.log(`🔄 [BUTTON CLICK] Update button pressed for sensor ${item.id}:`, item);
                updateFromAdafruit(item);
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.updateBtnText}>🔄</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                console.log('✏️ EDIT button pressed for sensor:', item);
                openEditModal(item);
              }}
            >
              <Text style={styles.editBtnText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteSensor(item.id)}
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading sensors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>📊 {roomName}</Text>
      </View>

      {/* Add Sensor Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add Sensor</Text>
      </TouchableOpacity>

      {/* Sensors List */}
      <FlatList
        data={sensors}
        renderItem={renderSensorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sensors yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add Sensor" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSensors(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSensor ? '✏️ Edit Sensor' : '📊 New Sensor'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Sensor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Room Temperature, Humidity Monitor"
                value={formData.sensor_name}
                onChangeText={(text) => setFormData({ ...formData, sensor_name: text })}
              />

              <Text style={styles.label}>Sensor Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.sensor_type}
                  onValueChange={(value) => setFormData({ ...formData, sensor_type: value })}
                  style={styles.picker}
                >
                  {sensorTypes.map((type) => (
                    <Picker.Item key={type} label={getSensorTypeDisplay(type)} value={type} />
                  ))}
                </Picker>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={editingSensor ? updateSensor : createSensor}
                >
                  <Text style={styles.saveBtnText}>
                    {editingSensor ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#27ae60',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  sensorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    padding: 15,
    elevation: 2,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sensorInfo: {
    flex: 1,
  },
  sensorType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  sensorName: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    fontWeight: '500',
  },
  sensorValue: {
    fontSize: 13,
    color: '#27ae60',
    marginBottom: 2,
    fontWeight: '600',
  },
  sensorNoValue: {
    fontSize: 11,
    color: '#bdc3c7',
    fontStyle: 'italic',
  },
  sensorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  updateBtn: {
    backgroundColor: '#27ae60',
    padding: 8,
    borderRadius: 4,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtnLoading: {
    opacity: 0.6,
  },
  updateBtnText: {
    color: 'white',
    fontSize: 16,
  },
  editBtn: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 4,
  },
  editBtnText: {
    color: 'white',
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 4,
  },
  deleteBtnText: {
    color: 'white',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#27ae60',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#ecf0f1',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
