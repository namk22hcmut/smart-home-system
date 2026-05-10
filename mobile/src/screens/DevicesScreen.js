/**
 * UserDevicesScreen.js - User Device Management
 * Allow users to create, edit, delete devices in their room
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
import CustomSlider from '../components/CustomSlider';

export default function UserDevicesScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_name: '',
    device_type: 'light',
    status: 'off',
    level: '0',
  });

  const deviceTypes = [
    'light',
    'fan',
    'ac',
    'heater',
    'door_lock',
    'security_camera',
    'plug',
    'switch',
    'thermostat',
    'other',
  ];

  const statusOptions = ['on', 'off'];

  // Load devices
  const loadDevices = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    try {
      const response = await apiService.get(`/rooms/${roomId}/devices`);

      if (response && response.success && isMounted.current) {
        setDevices(response.data || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);

      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load devices');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Create new device
  const createDevice = async () => {
    console.log('📋 Creating device with data:', { roomId, ...formData });
    
    // Strict validation
    if (!formData.device_name || !formData.device_name.trim()) {
      Alert.alert('Error', '❌ Please enter a device name');
      return;
    }

    try {
      const response = await apiService.post('/devices', {
        room_id: roomId,
        device_name: formData.device_name.trim(),
        device_type: formData.device_type,
        status: formData.status,
        level: parseInt(formData.level) || 0,
      });

      console.log('✅ Device created:', response);
      if (response && response.success) {
        Alert.alert('Success', 'Device created successfully!');
        resetForm();
        loadDevices(false);
      }
    } catch (error) {
      console.error('❌ Create device error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create device');
    }
  };

  // Update device
  const updateDevice = async () => {
    if (!formData.device_name.trim()) {
      Alert.alert('Error', 'Please enter device name');
      return;
    }

    try {
      const response = await apiService.put(`/devices/${editingDevice.id || editingDevice.device_id}`, {
        device_name: formData.device_name,
        device_type: formData.device_type,
        status: formData.status,
        level: parseInt(formData.level) || 0,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Device updated successfully!');
        resetForm();
        loadDevices(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update device');
    }
  };

  // Delete device
  const deleteDevice = async (deviceId) => {
    Alert.alert(
      'Delete Device',
      'Delete this device? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              const response = await apiService.delete(
                `/devices/${deviceId}`
              );

              if (response && response.success) {
                Alert.alert(
                  'Success',
                  'Device deleted!'
                );

                await loadDevices(false);
              } else {
                Alert.alert(
                  'Error',
                  response?.error || 'Failed to delete'
                );
              }
            } catch (error) {
              const errorMsg =
                error.response?.data?.error ||
                error.message ||
                'Failed to delete device';

              Alert.alert('Error', errorMsg);
            }
          },
        },
      ]
    );
  };

  // Toggle device status
  const toggleDeviceStatus = async (device) => {
    const itemId = device.id || device.device_id;
    const currentStatus = String(device.status || 'off').toLowerCase();

    const newStatus =
      currentStatus === 'on'
        ? 'off'
        : 'on';
    
    try {
      console.log(`🔄 Toggling device ${itemId} to ${newStatus}`);
      const response = await apiService.put(`/devices/${itemId}`, {
        device_name: device.device_name || device.name,
        device_type: device.device_type || device.type,
        status: newStatus,
        level: device.level || 0,
      });

      if (response && response.success) {
        console.log(`✅ Device ${itemId} toggled to ${newStatus}`);
        Alert.alert('Success', `Device turned ${newStatus}`);
        loadDevices(false);
      } else {
        Alert.alert('Error', response?.error || 'Failed to toggle device');
      }
    } catch (error) {
      console.error(`❌ Error toggling device: ${error.message}`);
      Alert.alert('Error', 'Failed to toggle device: ' + (error.message || 'Unknown error'));
    }
  };

  // Update device level (for dimmers, fans, etc.)
  const updateDeviceLevel = async (device, newLevel) => {
    const itemId = device.id || device.device_id;
    
    try {
      console.log(`🔆 Updating device ${itemId} level to ${newLevel}%`);
      const response = await apiService.put(`/devices/${itemId}`, {
        device_name: device.device_name || device.name,
        device_type: device.device_type || device.type,
        status:
          newLevel > 0
            ? 'on'
            : 'off',
        level: newLevel,
      });

      if (response && response.success) {
        console.log(`✅ Device ${itemId} level updated to ${newLevel}%`);
        loadDevices(false);
      } else {
        Alert.alert('Error', response?.error || 'Failed to update device level');
      }
    } catch (error) {
      console.error(`❌ Error updating device level: ${error.message}`);
      Alert.alert('Error', 'Failed to update device level');
    }
  };

  // Open add device modal
  const openAddModal = () => {
    setEditingDevice(null);
    setFormData({ device_name: '', device_type: 'light', status: 'off', level: '0' });
    setModalVisible(true);
  };

  // Open edit device modal
  const openEditModal = (device) => {
    setEditingDevice(device);

    setFormData({
      device_name:
        device.name || device.device_name || '',

      device_type:
        device.type || device.device_type || 'light',

      status: device.status || 'off',

      level: String(device.level || 0),
    });

    setModalVisible(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ device_name: '', device_type: 'light', status: 'off', level: '0' });
    setEditingDevice(null);
    setModalVisible(false);
  };

  // Initial load
  useEffect(() => {
    loadDevices();
  }, []);

  // Get device type display
  const getDeviceTypeDisplay = (type) => {
    const types = {
      light: 'Light',
      fan: 'Fan',
      ac: 'Air Conditioner',
      heater: 'Heater',
      door_lock: 'Door Lock',
      security_camera: 'Camera',
      plug: 'Smart Plug',
      switch: 'Switch',
      thermostat: 'Thermostat',
      other: 'Other',
    };

    return types[type] || type;
  };

  // Render device item
  const renderDeviceItem = ({ item }) => {
    const itemId = item.id || item.device_id;

    if (!itemId) {
      console.warn('⚠️ Device item missing id:', item);
      return null;
    }

    const deviceStatus = String(item.status || 'off').toLowerCase();
    const deviceLevel = Number(item.level) || 0;

    return (
      <View style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {String(item.name || item.device_name || 'Unknown')}
            </Text>

            <Text style={styles.deviceType}>
              {getDeviceTypeDisplay(
                String(item.type || item.device_type || 'other')
              )}
            </Text>
          </View>

          <View style={styles.deviceActions}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                {
                  backgroundColor:
                    deviceStatus === 'on'
                      ? '#111827'
                      : '#d1d5db'
                }
              ]}
              onPress={() => toggleDeviceStatus(item)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  {
                    color:
                      deviceStatus === 'on'
                        ? '#fff'
                        : '#374151'
                  }
                ]}
              >
                {deviceStatus === 'on' ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate('DeviceScheduling', {
                  device: { ...item, id: itemId }
                })
              }
            >
              <Text style={styles.actionBtnText}>
                Schedule
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate('DeviceActivityLogs', {
                  device: { ...item, id: itemId }
                })
              }
            >
              <Text style={styles.actionBtnText}>
                Logs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                openEditModal({ ...item, id: itemId })
              }
            >
              <Text style={styles.editBtnText}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteDevice(itemId)}
            >
              <Text style={styles.deleteBtnText}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.device_type !== 'door_lock' &&
          item.device_type !== 'switch' &&
          item.type !== 'door_lock' &&
          item.type !== 'switch' && (
            <View style={styles.levelContainer}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelLabel}>
                  Level
                </Text>

                <Text style={styles.levelValue}>
                  {deviceLevel}%
                </Text>
              </View>

              <CustomSlider
                min={0}
                max={100}
                value={deviceLevel}
                onChange={(newLevel) => {
                  updateDeviceLevel(item, newLevel);
                }}
                style={styles.slider}
              />
            </View>
          )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{roomName}</Text>
      </View>

      {/* Add Device Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add Device</Text>
      </TouchableOpacity>

      {/* Devices List */}
      <FlatList
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={(item, index) => String(item.id || item._id || index)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add Device" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDevices(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDevice ? 'Edit Device' : 'New Device'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Device Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Light, Ceiling Fan"
                value={formData.device_name}
                onChangeText={(text) => setFormData({ ...formData, device_name: text })}
              />

              <Text style={styles.label}>Device Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.device_type}
                  onValueChange={(value) => setFormData({ ...formData, device_type: value })}
                  style={styles.picker}
                >
                  {deviceTypes.map((type) => (
                    <Picker.Item key={type} label={getDeviceTypeDisplay(type)} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Initial Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  style={styles.picker}
                >
                  {statusOptions.map((status) => (
                    <Picker.Item
                      key={status}
                      label={status.toUpperCase()}
                      value={status}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Initial Level (0-100)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.level}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  const level = Math.max(0, Math.min(100, num));
                  setFormData({ ...formData, level: level.toString() });
                }}
                keyboardType="numeric"
              />

              <Text style={styles.hint}>Level is used for dimmable lights, fan speed, and similar devices.</Text>

              {/* Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={editingDevice ? updateDevice : createDevice}
                >
                  <Text style={styles.saveBtnText}>
                    {editingDevice ? 'Update' : 'Create'}
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
    color: '#666',
  },

  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
  },

  headerText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },

  addBtn: {
    backgroundColor: '#111827',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  deviceInfo: {
    flex: 1,
    paddingRight: 10,
  },

  deviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  deviceType: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  deviceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },

  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  actionBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  actionBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },

  editBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  editBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },

  deleteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  deleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },

  levelContainer: {
    marginTop: 8,
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 14,
  },

  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  levelLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },

  levelValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  slider: {
    marginTop: 4,
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
    fontSize: 22,
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

  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
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
