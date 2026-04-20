/**
 * UserRoomsScreen.js - User Room Management + Sensor Display
 * Allow users to create, edit, delete rooms and view sensors in their floor
 */
import React, { useState, useEffect } from 'react';
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
    const confirmed = window.confirm('Delete this sensor?');
    if (!confirmed) return;

    try {
      const response = await apiService.delete(`/sensors/${sensorId}`);
      if (response && response.success) {
        Alert.alert('Success', 'Sensor deleted!');
        loadSensors(currentRoomForSensor);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete sensor');
    }
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
    
    const confirmed = window.confirm('Delete this room and all its devices?\nThis action cannot be undone');
    if (!confirmed) {
      console.log('❌ Delete cancelled');
      return;
    }

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
              <Text style={styles.roomName}>🚪 {item.name || 'Unknown'}</Text>
              <Text style={styles.roomType}>{getRoomTypeDisplay(item.room_type || 'other')}</Text>
            </View>
            <View style={styles.roomActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(item)}
              >
                <Text style={styles.editBtnText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteRoom(item.id)}
              >
                <Text style={styles.deleteBtnText}>🗑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.expandBtn, isExpanded && styles.expandBtnActive]}
                onPress={() => setSelectedRoomId(isExpanded ? null : item.id)}
              >
                <Text style={styles.expandBtnText}>{isExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {item.description ? (
          <Text style={styles.roomDescription}>{item.description}</Text>
        ) : null}

        <View style={styles.roomMeta}>
          <Text style={styles.devicesCount}>⚙️ {Number(item.devices) || 0}</Text>
          <Text style={styles.sensorsCount}>📊 {roomSensors.length}</Text>
        </View>

        {/* Sensors section - shown when expanded */}
        {isExpanded && (
          <View style={styles.sensorsSection}>
            <View style={styles.sensorsSectionHeader}>
              <Text style={styles.sectionTitle}>📊 Sensors:</Text>
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
                  <View key={sensor.id} style={styles.sensorCard}>
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
            <Text style={styles.navigateBtnText}>👉 Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navigateBtn, { flex: 1, marginLeft: 6, backgroundColor: '#9b59b6' }]}
            onPress={() => navigation.navigate('AutomationRules', { roomId: item.id, roomName: item.name })}
          >
            <Text style={styles.navigateBtnText}>⚙️ Automation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>📍 {floorName}</Text>
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
                {editingRoom ? '✏️ Edit Room' : '🚪 New Room'}
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
    backgroundColor: '#9b59b6',
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
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
    elevation: 2,
    overflow: 'hidden',
  },
  roomHeaderButton: {
    padding: 15,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roomType: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
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
  expandBtn: {
    backgroundColor: '#95a5a6',
    padding: 8,
    borderRadius: 4,
    width: 32,
    alignItems: 'center',
  },
  expandBtnActive: {
    backgroundColor: '#e67e22',
  },
  expandBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  roomMeta: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  devicesCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  sensorsCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  // Sensors section
  sensorsSection: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sensorsList: {
    marginTop: 0,
  },
  sensorCard: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  sensorInfo: {
    marginLeft: 5,
    flex: 1,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  sensorNameDisplay: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontWeight: '500',
  },
  sensorValueDisplay: {
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
  noSensorsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 5,
  },

  // Button row for side-by-side buttons
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 0,
    marginBottom: 15,
    gap: 0,
  },

  // Navigation button
  navigateBtn: {
    backgroundColor: '#e67e22',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  navigateBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  descriptionInput: {
    textAlignVertical: 'top',
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

  // Sensor specific styles
  sensorsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSensorBtn: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addSensorBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sensorActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  sensorEditBtn: {
    backgroundColor: '#3498db',
    padding: 6,
    borderRadius: 3,
  },
  sensorEditBtnText: {
    color: 'white',
    fontSize: 12,
  },
  sensorDeleteBtn: {
    backgroundColor: '#e74c3c',
    padding: 6,
    borderRadius: 3,
  },
  sensorDeleteBtnText: {
    color: 'white',
    fontSize: 12,
  },
});
