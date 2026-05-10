/**
 * UserRoomsScreen.js - User Room Management + Sensor Display
 * Allow users to create, edit, delete rooms and view sensors in their floor
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

export default function UserRoomsScreen({ navigation, route }) {
  const { floorId, floorName } = route.params;
  const isMounted = useRef(true);
  
  const [rooms, setRooms] = useState([]);
  const [sensors, setSensors] = useState({});  // Store sensors for each room
  const [selectedRoomId, setSelectedRoomId] = useState(null);  // Track which room's sensors to show
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_name: '',
    room_type: 'bedroom',
    description: '',
  });

  // Sensor CRUD states
  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [currentRoomForSensor, setCurrentRoomForSensor] = useState(null);
  const [sensorFormData, setSensorFormData] = useState({
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

  const roomTypes = [
    'bedroom',
    'living_room',
    'kitchen',
    'bathroom',
    'dining_room',
    'study',
    'garage',
    'hallway',
    'other',
  ];

  // Load rooms
  const loadRooms = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get(`/floors/${floorId}/rooms`);
      if (response && response.success) {
        setRooms(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'rooms');
        console.log('Room data sample:', (response.data || [])[0]);
        // Load sensors for each room
        (response.data || []).forEach(room => {
          console.log('Loading sensors for room:', room.id, room);
          if (room.id) {
            loadSensors(room.id);
          } else {
            console.warn('⚠️ Room missing ID:', room);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load sensors for a specific room
  const loadSensors = async (roomId) => {
    if (!roomId) {
      console.warn('⚠️ loadSensors called with invalid roomId:', roomId);
      return;
    }
    try {
      const response = await apiService.get(`/rooms/${roomId}/sensors`);
      if (response && response.success) {
        setSensors(prev => ({
          ...prev,
          [roomId]: response.data || []
        }));
        console.log(`✅ Loaded ${(response.data || []).length} sensors for room ${roomId}`);
      }
    } catch (error) {
      console.error(`❌ Error loading sensors for room ${roomId}:`, error);
      // Don't show alert for sensors - they're optional
    }
  };

  // Create new sensor
  const createSensor = async () => {
    if (!sensorFormData.sensor_name.trim()) {
      Alert.alert('Error', 'Please enter sensor name');
      return;
    }

    try {
      const response = await apiService.post('/sensors', {
        room_id: currentRoomForSensor,
        sensor_name: sensorFormData.sensor_name.trim(),
        sensor_type: sensorFormData.sensor_type,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Sensor added!');
        resetSensorForm();
        loadSensors(currentRoomForSensor);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create sensor');
    }
  };

  // Update sensor
  const updateSensor = async () => {
    if (!sensorFormData.sensor_name.trim()) {
      Alert.alert('Error', 'Please enter sensor name');
      return;
    }

    try {
      const response = await apiService.put(`/sensors/${editingSensor.id}`, {
        sensor_name: sensorFormData.sensor_name,
        sensor_type: sensorFormData.sensor_type,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Sensor updated!');
        resetSensorForm();
        loadSensors(currentRoomForSensor);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update sensor');
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
                loadSensors(currentRoomForSensor);
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

  // Open sensor modal to add
  const openAddSensorModal = (roomId) => {
    setEditingSensor(null);
    setCurrentRoomForSensor(roomId);
    setSensorFormData({ sensor_name: '', sensor_type: 'temperature' });
    setSensorModalVisible(true);
  };

  // Open sensor modal to edit
  const openEditSensorModal = (sensor, roomId) => {
    setEditingSensor(sensor);
    setCurrentRoomForSensor(roomId);
    setSensorFormData({
      sensor_name: sensor.name,
      sensor_type: sensor.type || 'temperature',
    });
    setSensorModalVisible(true);
  };

  // Reset sensor form
  const resetSensorForm = () => {
    setSensorFormData({ sensor_name: '', sensor_type: 'temperature' });
    setEditingSensor(null);
    setCurrentRoomForSensor(null);
    setSensorModalVisible(false);
  };

  // Create new room
  const createRoom = async () => {
    console.log('🚪 Creating room with data:', { floorId, ...formData });
    
    // Strict validation
    if (!formData.room_name || !formData.room_name.trim()) {
      Alert.alert('Error', '❌ Please enter a room name');
      return;
    }

    try {
      const response = await apiService.post('/rooms', {
        floor_id: floorId,
        room_name: formData.room_name.trim(),
        room_type: formData.room_type,
        description: formData.description,
      });

      console.log('✅ Room created:', response);
      if (response && response.success) {
        Alert.alert('Success', 'Room created successfully!');
        resetForm();
        loadRooms(false);
      }
    } catch (error) {
      console.error('❌ Create room error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create room');
    }
  };

  // Update room
  const updateRoom = async () => {
    if (!formData.room_name.trim()) {
      Alert.alert('Error', 'Please enter room name');
      return;
    }

    try {
      const response = await apiService.put(`/rooms/${editingRoom.id}`, {
        room_name: formData.room_name,
        room_type: formData.room_type,
        description: formData.description,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Room updated successfully!');
        resetForm();
        loadRooms(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update room');
    }
  };

  // Delete room
  const deleteRoom = async (roomId) => {
    console.log('🗑️ Delete button clicked for room:', roomId);
    
    Alert.alert(
      'Delete Room',
      'Delete this room and all its devices? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('❌ Delete cancelled');
          },
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              console.log('📤 Sending DELETE request to /api/rooms/' + roomId);
              const response = await apiService.delete(`/rooms/${roomId}`);
              console.log('📄 Delete response:', response);
              
              if (response && response.success) {
                console.log('✅ Room deleted successfully!');
                Alert.alert('Success', 'Room deleted!');
                await loadRooms(false);
              } else {
                Alert.alert('Error', response?.error || 'Failed to delete');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              const errorMsg = error.response?.data?.error || error.message || 'Failed to delete room';
              console.error('Error details:', errorMsg);
              Alert.alert('Error', errorMsg);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Open add room modal
  const openAddModal = () => {
    setEditingRoom(null);
    setFormData({ room_name: '', room_type: 'bedroom', description: '' });
    setModalVisible(true);
  };

  // Open edit room modal
  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      room_name: room.name,
      room_type: room.room_type || 'bedroom',
      description: room.description || '',
    });
    setModalVisible(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ room_name: '', room_type: 'bedroom', description: '' });
    setEditingRoom(null);
    setModalVisible(false);
  };

  // Initial load
  useEffect(() => {
    loadRooms();
  }, []);

  // Get room type display
  const getRoomTypeDisplay = (type) => {
    const types = {
      bedroom: '🛏️ Bedroom',
      living_room: '🛋️ Living Room',
      kitchen: '🍳 Kitchen',
      bathroom: '🚿 Bathroom',
      dining_room: '🍽️ Dining Room',
      study: '📚 Study',
      garage: '🚗 Garage',
      hallway: '🚪 Hallway',
      other: '📦 Other',
    };
    return types[type] || type;
  };

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
  const renderSensorItem = (sensorItem, roomId) => (
    <View style={styles.sensorCard}>
      <View style={styles.sensorHeader}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorName}>{getSensorTypeDisplay(sensorItem.type || 'other')}</Text>
          <Text style={styles.sensorNameDisplay}>📝 {sensorItem.name || 'Unknown'}</Text>
          {sensorItem.value !== null && sensorItem.value !== undefined ? (
            <Text style={styles.sensorValueDisplay}>
              📊 Value: {Number(sensorItem.value).toFixed(1)} {sensorItem.unit}
            </Text>
          ) : (
            <Text style={styles.sensorNoValue}>No data yet</Text>
          )}
        </View>
        <View style={styles.sensorActions}>
          <TouchableOpacity
            style={styles.sensorEditBtn}
            onPress={() => openEditSensorModal(sensorItem, roomId)}
          >
            <Text style={styles.sensorEditBtnText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sensorDeleteBtn}
            onPress={() => deleteSensor(sensorItem.id)}
          >
            <Text style={styles.sensorDeleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render room item with optional sensor section
  const renderRoomItem = ({ item }) => {
    const roomSensors = sensors[item.id] || [];
    const isExpanded = selectedRoomId === item.id;

    return (
      <View style={styles.roomCard}>
        <TouchableOpacity
          style={styles.roomHeaderButton}
          onPress={() => setSelectedRoomId(isExpanded ? null : item.id)}
        >
          <View style={styles.roomHeader}>
            <View style={styles.roomInfo}>
              <Text style={styles.roomName}>{item.name || 'Unknown'}</Text>
              <Text style={styles.roomType}>
                {(item.room_type || 'other').replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.roomActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(item)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteRoom(item.id)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.expandBtn, isExpanded && styles.expandBtnActive]}
                onPress={() => setSelectedRoomId(isExpanded ? null : item.id)}
              >
                <Text style={styles.expandBtnText}>
                  Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {item.description ? (
          <Text style={styles.roomDescription}>{item.description}</Text>
        ) : null}

        <View style={styles.roomMeta}>
          <Text style={styles.devicesCount}>
            {Number(item.devices) || 0} devices
          </Text>

          <Text style={styles.sensorsCount}>
            {roomSensors.length} sensors
          </Text>
        </View>

        {/* Sensors section - shown when expanded */}
        {isExpanded && (
          <View style={styles.sensorsSection}>
            <View style={styles.sensorsSectionHeader}>
              <Text style={styles.sectionTitle}>Sensors:</Text>
              <TouchableOpacity
                style={styles.addSensorBtn}
                onPress={() => openAddSensorModal(item.id)}
              >
                <Text style={styles.addSensorBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {roomSensors.length > 0 ? (
              <View style={styles.sensorsList}>
                {roomSensors.map((sensor) => (
                  <View key={sensor.id}>
                    {renderSensorItem(sensor, item.id)}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noSensorsText}>No sensors</Text>
            )}
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.navigateBtn, { flex: 1, marginRight: 6 }]}
            onPress={() => navigation.navigate('UserDevices', { roomId: item.id, roomName: item.name })}
          >
            <Text style={styles.navigateBtnText}>Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navigateBtn, { flex: 1, marginLeft: 6 }]}
            onPress={() => navigation.navigate('AutomationRules', { roomId: item.id, roomName: item.name })}
          >
            <Text style={styles.navigateBtnText}>Automation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          {floorName}
        </Text>
      </View>

      {/* Add Room Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add Room</Text>
      </TouchableOpacity>

      {/* Rooms List */}
      <FlatList
        data={rooms}
        renderItem={renderRoomItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add Room" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRooms(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoom ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Room Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Master Bedroom, Kitchen"
                value={formData.room_name}
                onChangeText={(text) => setFormData({ ...formData, room_name: text })}
              />

              <Text style={styles.label}>Room Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.room_type}
                  onValueChange={(value) => setFormData({ ...formData, room_type: value })}
                  style={styles.picker}
                >
                  {roomTypes.map((type) => (
                    <Picker.Item key={type} label={getRoomTypeDisplay(type)} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Optional description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline={true}
                numberOfLines={4}
              />

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={editingRoom ? updateRoom : createRoom}
                >
                  <Text style={styles.saveBtnText}>
                    {editingRoom ? 'Update' : 'Create'}
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

      {/* Add/Edit Sensor Modal */}
      <Modal visible={sensorModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSensor ? '✏️ Edit Sensor' : '📊 New Sensor'}
              </Text>
              <TouchableOpacity onPress={resetSensorForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Sensor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Room Temperature, Humidity Monitor"
                value={sensorFormData.sensor_name}
                onChangeText={(text) => setSensorFormData({ ...sensorFormData, sensor_name: text })}
              />

              <Text style={styles.label}>Sensor Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sensorFormData.sensor_type}
                  onValueChange={(value) => setSensorFormData({ ...sensorFormData, sensor_type: value })}
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
                  onPress={resetSensorForm}
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
    backgroundColor: '#f4f5f7',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },

  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },

  addBtn: {
    backgroundColor: '#111827',

    marginHorizontal: 16,
    marginBottom: 16,

    paddingVertical: 13,

    borderRadius: 14,

    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 14,

    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  roomHeaderButton: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },

  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  roomInfo: {
    flex: 1,
    paddingRight: 12,
  },

  roomName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  roomType: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  roomActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editBtn: {
    backgroundColor: '#f3f4f6',

    minWidth: 64,

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 10,

    marginRight: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  editBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },

  deleteBtn: {
    backgroundColor: '#fee2e2',

    minWidth: 72,

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 10,

    marginRight: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },

  expandBtn: {
    backgroundColor: '#111827',

    minWidth: 82,

    paddingHorizontal: 14,
    paddingVertical: 9,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',
  },

  expandBtnActive: {
    backgroundColor: '#e5e7eb',
  },

  expandBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  roomDescription: {
    fontSize: 14,
    color: '#6b7280',

    paddingHorizontal: 18,

    marginBottom: 8,

    lineHeight: 20,
  },

  roomMeta: {
    flexDirection: 'row',

    paddingHorizontal: 18,

    marginBottom: 14,
  },

  devicesCount: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 16,
  },

  sensorsCount: {
    fontSize: 13,
    color: '#6b7280',
  },

  sensorsSection: {
    marginHorizontal: 18,
    marginBottom: 16,

    paddingTop: 2,
  },

  sensorsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  addSensorBtn: {
    backgroundColor: '#111827',

    paddingHorizontal: 12,
    paddingVertical: 7,

    borderRadius: 10,
  },

  addSensorBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  sensorCard: {
    backgroundColor: '#f9fafb',

    borderRadius: 12,

    padding: 14,

    marginBottom: 10,

    borderWidth: 1,
    borderColor: '#ececec',
  },

  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sensorInfo: {
    flex: 1,
    paddingRight: 10,
  },

  sensorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  sensorNameDisplay: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 6,
  },

  sensorValueDisplay: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },

  sensorNoValue: {
    fontSize: 12,
    color: '#9ca3af',
  },

  sensorActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sensorEditBtn: {
    backgroundColor: '#f3f4f6',

    minWidth: 56,

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 8,

    marginRight: 6,

    alignItems: 'center',
  },

  sensorEditBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },

  sensorDeleteBtn: {
    backgroundColor: '#fee2e2',

    minWidth: 64,

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 8,

    alignItems: 'center',
  },

  sensorDeleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },

  noSensorsText: {
    fontSize: 13,
    color: '#9ca3af',
  },

  buttonRow: {
    flexDirection: 'row',

    paddingHorizontal: 18,

    paddingBottom: 18,
  },

  navigateBtn: {
    backgroundColor: '#111827',

    paddingVertical: 11,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',
  },

  automationBtn: {
    backgroundColor: '#111827',
  },

  navigateBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    padding: 22,

    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  closeBtn: {
    fontSize: 24,
    color: '#9ca3af',
  },

  formContainer: {
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',

    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',

    borderRadius: 12,

    padding: 14,

    fontSize: 14,

    backgroundColor: '#f9fafb',

    color: '#111827',
  },

  descriptionInput: {
    textAlignVertical: 'top',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',

    borderRadius: 12,

    backgroundColor: '#f9fafb',

    overflow: 'hidden',
  },

  picker: {
    height: 50,
  },

  buttonGroup: {
    flexDirection: 'row',
    marginTop: 28,
  },

  btn: {
    flex: 1,

    paddingVertical: 14,

    borderRadius: 12,

    alignItems: 'center',
  },

  saveBtn: {
    backgroundColor: '#111827',
    marginRight: 8,
  },

  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  cancelBtn: {
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },

  cancelBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
});