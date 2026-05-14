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
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';
import { theme } from '../styles/theme';

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: floorName || 'Rooms',
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.card,
      headerTitleStyle: {
        fontWeight: '700',
        color: theme.colors.card,
      },
    });
  }, [navigation, floorName]);



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

  // Load sensors for a specific room (just fetch, don't store - we navigate to SensorsScreen instead)
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
    }
  };

  // Create new room
  const createRoom = async () => {
    console.log('Creating room with data:', { floorId, ...formData });
    
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
    console.log('Delete button clicked for room:', roomId);
    
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
      bedroom: 'Bedroom',
      living_room: 'Living Room',
      kitchen: 'Kitchen',
      bathroom: 'Bathroom',
      dining_room: 'Dining Room',
      study: 'Study',
      garage: 'Garage',
      hallway: 'Hallway',
      other: 'Other',
    };
    return types[type] || type;
  };

  // Render room item with optional sensor section
  const renderRoomItem = ({ item }) => {
    const roomSensors = sensors[item.id] || [];

    return (
      <View style={styles.roomCard}>
        <View style={styles.roomHeader}>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
          </View>

          <View style={styles.roomActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openEditModal(item)}
              accessibilityLabel="Edit room"
            >
              <MaterialIcons name="edit" size={18} color={theme.colors.card} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButtonDanger}
              onPress={() => deleteRoom(item.id)}
              accessibilityLabel="Delete room"
            >
              <MaterialIcons name="delete-outline" size={18} color={theme.colors.card} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.roomMeta}>
          <Text style={styles.devicesCount}>Devices: {Number(item.devices) || 0}</Text>
          <Text style={styles.sensorsCount}>Sensors: {roomSensors.length}</Text>
        </View>



        {/* Navigation buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.navigateBtn, styles.navigateBtnPrimary, { flex: 1 }]}
            onPress={() => navigation.navigate('UserDevices', { roomId: item.id, roomName: item.name })}
          >
            <Text style={styles.navigateBtnText}>Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navigateBtn, styles.navigateBtnPrimary, { flex: 1 }]}
            onPress={() => navigation.navigate('UserSensors', { roomId: item.id, roomName: item.name })}
          >
            <Text style={styles.navigateBtnText}>Sensors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navigateBtn, styles.navigateBtnPrimary, { flex: 1 }]}
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Rooms</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.86}>
          <MaterialIcons name="add" size={20} color={theme.colors.card} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoomItem}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="meeting-room" size={34} color={theme.colors.gray2} />
            </View>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>Add the first room for this floor</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRooms(false)} />}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoom ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity onPress={resetForm} accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
              </TouchableOpacity>
            </View>

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
                  activeOpacity={0.86}
                >
                  <Text style={styles.saveBtnText}>
                    {editingRoom ? 'Update' : 'Create'}
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
    backgroundColor: theme.colors.background,
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
  roomCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    marginBottom: 14,
    padding: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
    overflow: 'hidden',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  roomMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray1,
  },
  expandedSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  floorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomsCount: {
    fontSize: 12,
    color: theme.colors.gray1,
    fontWeight: '600',
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openHintText: {
    fontSize: 12,
    color: theme.colors.gray1,
    fontWeight: '600',
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
    color: theme.colors.gray1,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'nowrap',
  },
  navigateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateBtnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  navigateBtnText: {
    color: theme.colors.card,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
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
  closeBtn: {
    fontSize: 16,
    color: theme.colors.gray2,
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
  descriptionInput: {
    textAlignVertical: 'top',
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

  // Sensor specific styles
  sensorsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSensorBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addSensorBtnText: {
    color: theme.colors.card,
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
    backgroundColor: theme.colors.primary,
    padding: 6,
    borderRadius: 3,
  },
  sensorEditBtnText: {
    color: theme.colors.card,
    fontSize: 12,
  },
  sensorDeleteBtn: {
    backgroundColor: theme.colors.accent,
    padding: 6,
    borderRadius: 3,
  },
  sensorDeleteBtnText: {
    color: theme.colors.card,
    fontSize: 12,
  },
});
