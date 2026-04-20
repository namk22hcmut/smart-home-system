/**
 * UserDevicesScreen.js - User Device Management
 * Allow users to create, edit, delete devices in their room
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
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';
import CustomSlider from '../components/CustomSlider';

export default function UserDevicesScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
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
      if (response && response.success) {
        setDevices(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'devices');
      }
    } catch (error) {
      console.error('❌ Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      const response = await apiService.put(`/devices/${editingDevice.id}`, {
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
    console.log('🗑️ Delete button clicked for device:', deviceId);
    
    const confirmed = window.confirm('Delete this device?\nThis action cannot be undone');
    if (!confirmed) {
      console.log('❌ Delete cancelled');
      return;
    }

    try {
      console.log('📤 Sending DELETE request to /api/devices/' + deviceId);
      const response = await apiService.delete(`/devices/${deviceId}`);
      console.log('✅ Delete response:', response);
      
      if (response && response.success) {
        console.log('✅ Device deleted successfully!');
        Alert.alert('Success', 'Device deleted!');
        await loadDevices(false);
      } else {
        Alert.alert('Error', response?.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete device';
      console.error('Error details:', errorMsg);
      Alert.alert('Error', errorMsg);
    }
  };

  // Toggle device status
  const toggleDeviceStatus = async (device) => {
    const itemId = device.id || device.device_id;
    const newStatus = device.status === 'on' ? 'off' : 'on';
    
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
        status: newLevel > 0 ? 'on' : 'off',
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
      device_name: device.name,
      device_type: device.type,
      status: device.status,
      level: device.level.toString(),
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
      light: '💡 Light',
      fan: '🌀 Fan',
      ac: '❄️ Air Conditioner',
      heater: '🔥 Heater',
      door_lock: '🔒 Door Lock',
      security_camera: '📹 Camera',
      plug: '🔌 Smart Plug',
      switch: '🔘 Switch',
      thermostat: '🌡️ Thermostat',
      other: '⚙️ Other',
    };
    return types[type] || type;
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === 'on' ? '#27ae60' : '#95a5a6';
  };

  // Render device item
  const renderDeviceItem = ({ item }) => {
    // Debug: log item structure
    const itemId = item.id || item.device_id;
    if (!itemId) {
      console.warn('⚠️ Device item missing id:', item);
      return null;
    }

    // Normalize item properties
    const deviceStatus = String(item.status || 'off').toLowerCase();
    const deviceLevel = Number(item.level) || 0;

    return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>⚙️ {String(item.name || item.device_name || 'Unknown')}</Text>
          <Text style={styles.deviceType}>{getDeviceTypeDisplay(String(item.type || item.device_type || 'other'))}</Text>
        </View>
        <View style={styles.deviceActions}>
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: getStatusColor(deviceStatus) }]}
            onPress={() => toggleDeviceStatus(item)}
          >
            <Text style={styles.statusBtnText}>{deviceStatus.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => navigation.navigate('DeviceScheduling', { device: { ...item, id: itemId } })}
            title="Schedule"
          >
            <Text style={styles.scheduleBtnText}>⏰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logsBtn}
            onPress={() => navigation.navigate('DeviceActivityLogs', { device: { ...item, id: itemId } })}
            title="Logs"
          >
            <Text style={styles.logsBtnText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal({ ...item, id: itemId })}
          >
            <Text style={styles.editBtnText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteDevice(itemId)}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {item.device_type !== 'door_lock' && item.device_type !== 'switch' && item.type !== 'door_lock' && item.type !== 'switch' && (
        <View style={styles.levelContainer}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelLabel}>💡 Brightness</Text>
            <Text style={styles.levelValue}>{deviceLevel}%</Text>
          </View>
          <CustomSlider
            min={0}
            max={100}
            value={deviceLevel}
            onChange={(newLevel) => {
              console.log(`🔄 Slider moved to ${newLevel}%`);
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
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🚪 {roomName}</Text>
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
                {editingDevice ? '✏️ Edit Device' : '⚙️ New Device'}
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

              <Text style={styles.hint}>💡 Tip: Level is used for dimmable lights, fans speed, etc.</Text>

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
    backgroundColor: '#f39c12',
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
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceType: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
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
  scheduleBtn: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  scheduleBtnText: {
    color: 'white',
    fontSize: 16,
  },
  logsBtn: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  logsBtnText: {
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
  levelContainer: {
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  levelValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  slider: {
    marginTop: 8,
  },
  levelBar: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
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
    maxHeight: '85%',
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
  hint: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 8,
    fontStyle: 'italic',
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
