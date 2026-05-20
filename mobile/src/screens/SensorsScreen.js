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
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';
import adafruitService from '../services/adafruit';
import theme from '../styles/theme';

export default function UserSensorsScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
  const isMounted = useRef(true);
  const canUseAdafruit = adafruitService.isTargetRoom(roomId);
  
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Sensors',
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
      if (!canUseAdafruit) {
        Alert.alert('Not available', 'This room uses local database data only.');
        return;
      }

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
        Alert.alert('Success', `Updated: ${sensor.name} = ${result.data.value}`);
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
      temperature: 'Temperature',
      humidity: 'Humidity',
      motion: 'Motion',
      light: 'Light',
      co2: 'CO2',
      pressure: 'Pressure',
      other: 'Other',
    };
    return types[type] || type;
  };

  const getSensorIconName = (type) => {
    const icons = {
      temperature: 'thermostat',
      humidity: 'opacity',
      motion: 'sensors',
      light: 'wb-sunny',
      co2: 'air',
      pressure: 'speed',
      other: 'sensors',
    };
    return icons[type] || 'sensors';
  };

  // Render sensor item
  const renderSensorItem = ({ item }) => {
    console.log('🎨 Rendering sensor:', item);
    const isUpdating = updatingFeeds[item.id];
    
    return (
      <View style={styles.sensorCard}>
        <View style={styles.sensorHeader}>
          <View style={styles.sensorIconWrap}>
            <MaterialIcons name={getSensorIconName(item.type || 'other')} size={22} color={theme.colors.text} />
          </View>

          <View style={styles.sensorInfo}>
            <Text style={styles.sensorType}>{getSensorTypeDisplay(item.type || 'other')}</Text>
            <Text style={styles.sensorName}>{item.name || 'Unknown'}</Text>
            {item.value !== null && item.value !== undefined ? (
              <Text style={styles.sensorValue}>
                Value: {Number(item.value).toFixed(1)} {item.unit}
              </Text>
            ) : (
              <Text style={styles.sensorNoValue}>No data yet</Text>
            )}
          </View>
          <View style={styles.sensorActions}>
            {canUseAdafruit && (
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
                <MaterialIcons name="refresh" size={18} color={theme.colors.card} />
              )}
            </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                console.log('✏️ EDIT button pressed for sensor:', item);
                openEditModal(item);
              }}
            >
              <MaterialIcons name="edit" size={18} color={theme.colors.card} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteSensor(item.id)}
            >
              <MaterialIcons name="delete-outline" size={18} color={theme.colors.card} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading sensors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{roomName}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.86}>
          <MaterialIcons name="add" size={20} color={theme.colors.card} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sensors}
        renderItem={renderSensorItem}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="sensors" size={34} color={theme.colors.gray2} />
            </View>
            <Text style={styles.emptyText}>No sensors yet</Text>
            <Text style={styles.emptySubtext}>Add the first sensor for this room</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSensors(false)} />}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSensor ? 'Edit Sensor' : 'New Sensor'}
              </Text>
              <TouchableOpacity onPress={resetForm} accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
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
                  activeOpacity={0.86}
                >
                  <Text style={styles.saveBtnText}>
                    {editingSensor ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={resetForm}
                  activeOpacity={0.86}
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
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sensorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    marginBottom: 12,
    padding: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sensorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorType: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gray2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sensorName: {
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: 6,
    fontWeight: '700',
  },
  sensorValue: {
    fontSize: 14,
    color: theme.colors.accent,
    marginBottom: 0,
    fontWeight: '600',
  },
  sensorNoValue: {
    fontSize: 13,
    color: theme.colors.gray2,
    fontStyle: 'italic',
  },
  sensorActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  updateBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtnLoading: {
    opacity: 0.6,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray2,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 28,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.gray2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    backgroundColor: theme.colors.background,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
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
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
