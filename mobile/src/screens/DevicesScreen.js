/**
 * UserDevicesScreen.js - User Device Management & Control
 * Allow users to create, edit, delete devices + control (on/off + level slider) + schedules
 */
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { theme } from '../styles/theme';
import CustomSlider from '../components/CustomSlider';

export default function UserDevicesScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
  const isMounted = useRef(true);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_name: '',
    device_type: 'light',
  });
  
  const [controllingDeviceId, setControllingDeviceId] = useState(null);
  const [deviceLevels, setDeviceLevels] = useState({}); // Track device levels locally

  const deviceTypes = ['light', 'fan', 'ac', 'heater', 'thermostat', 'door_lock', 'camera', 'switch', 'plug', 'other'];

  const getDeviceId = (device) => device?.device_id ?? device?.id;

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Devices',
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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadDevices();
  }, []);

  // Reload devices when screen gains focus (ensure authoritative state)
  useFocusEffect(
    React.useCallback(() => {
      loadDevices(false);
    }, [])
  );

  const loadDevices = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get(`/rooms/${roomId}/devices`);
      if (response && response.success) {
        const normalizedDevices = (response.data || []).map((device) => ({
          ...device,
          id: device.device_id ?? device.id,
        }));
        setDevices(normalizedDevices);
        // Initialize device levels
        const levels = {};
        normalizedDevices.forEach(device => {
          const deviceId = getDeviceId(device);
          if (deviceId !== undefined && deviceId !== null) {
            levels[deviceId] = device.level || 0;
          }
        });
        setDeviceLevels(levels);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createDevice = async () => {
    if (!formData.device_name.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    try {
      const response = await apiService.post('/devices', {
        room_id: roomId,
        device_name: formData.device_name.trim(),
        device_type: formData.device_type,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Device created successfully!');
        resetForm();
        loadDevices(false);
      }
    } catch (error) {
      console.error('Create device error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create device');
    }
  };

  const updateDevice = async () => {
    if (!formData.device_name.trim()) {
      Alert.alert('Error', 'Please enter device name');
      return;
    }

    try {
      const response = await apiService.put(`/devices/${editingDevice.id}`, {
        device_name: formData.device_name,
        device_type: formData.device_type,
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

  const deleteDevice = (deviceId) => {
    Alert.alert(
      'Delete Device?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/devices/${deviceId}`);
              if (response && response.success) {
                Alert.alert('Success', 'Device deleted!');
                loadDevices(false);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Toggle device on/off
  const toggleDeviceStatus = async (device) => {
    const deviceId = getDeviceId(device);
    if (deviceId === undefined || deviceId === null) {
      Alert.alert('Error', 'Invalid device id');
      return;
    }

    try {
      const newStatus = device.status === 'on' ? 'off' : 'on';
      const response = await apiService.post('/device-status', {
        device_id: deviceId,
        status: newStatus,
        level: deviceLevels[deviceId] || 0,
      });

      if (response && response.success) {
        console.log('Device toggle response:', response);
        // Refresh devices from server to ensure authoritative state
        await loadDevices(false);
      }
    } catch (error) {
      console.error('Error toggling device:', error);
      Alert.alert('Error', 'Failed to control device');
    }
  };

  // Set device level
  const setDeviceLevel = async (device, level) => {
    const deviceId = getDeviceId(device);
    if (deviceId === undefined || deviceId === null) {
      Alert.alert('Error', 'Invalid device id');
      return;
    }

    try {
      setDeviceLevels(prev => ({ ...prev, [deviceId]: level }));
      
      const response = await apiService.post('/device-status', {
        device_id: deviceId,
        status: device.status,
        level: Math.round(level),
      });

      if (response && response.success) {
        console.log('Device level set to', level);
      }
    } catch (error) {
      console.error('Error setting device level:', error);
    }
  };

  const openAddModal = () => {
    setEditingDevice(null);
    setFormData({ device_name: '', device_type: 'light' });
    setModalVisible(true);
  };

  const handleEditDevice = (device) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name || '',
      device_type: device.device_type || 'light',
    });
    setModalVisible(true);
  };

  const handleSaveDevice = () => {
    if (editingDevice) {
      updateDevice();
    } else {
      createDevice();
    }
  };

  const resetForm = () => {
    setFormData({ device_name: '', device_type: 'light' });
    setEditingDevice(null);
    setModalVisible(false);
  };

  const renderDeviceItem = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName} numberOfLines={1}>{item.device_name || 'Unnamed Device'}</Text>
          <Text style={styles.deviceType}>{item.device_type || 'device'}</Text>
        </View>

        <View style={styles.deviceActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEditDevice(item)}
            accessibilityLabel="Edit device"
          >
            <MaterialIcons name="edit" size={18} color={theme.colors.gray1} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => deleteDevice(item.id)}
            accessibilityLabel="Delete device"
          >
            <MaterialIcons name="delete-outline" size={18} color={theme.colors.gray1} />
          </TouchableOpacity>
        </View>
      </View>



      <View style={styles.controlSection}>
        <View style={styles.statusRow}>
          <Text style={styles.controlLabel}>Status</Text>
          <TouchableOpacity
            style={[
              styles.statusToggle,
              { backgroundColor: item.status === 'on' ? theme.colors.accent : theme.colors.gray2 }
            ]}
            onPress={() => toggleDeviceStatus(item)}
          >
            <Text style={styles.statusToggleText}>
              {item.status === 'on' ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.controlLabel}>Level: {Math.round(deviceLevels[getDeviceId(item)] || 0)}%</Text>
          <CustomSlider
            style={styles.slider}
            min={0}
            max={100}
            value={deviceLevels[getDeviceId(item)] || 0}
            onChange={(value) => setDeviceLevel(item, value)}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.scheduleBtn, styles.actionBtn]}
            onPress={() => {
              if (navigation.navigate) {
                navigation.navigate('DeviceScheduling', {
                  device: item,
                  deviceId: getDeviceId(item),
                  deviceName: item.device_name,
                });
              }
            }}
            activeOpacity={0.86}
          >
            <MaterialIcons name="schedule" size={16} color={theme.colors.card} />
            <Text style={styles.scheduleBtnText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logsBtn, styles.actionBtn]}
            onPress={() => {
              if (navigation.navigate) {
                navigation.navigate('DeviceActivityLogs', {
                  device: item,
                });
              }
            }}
            activeOpacity={0.86}
          >
            <MaterialIcons name="history" size={16} color={theme.colors.card} />
            <Text style={styles.scheduleBtnText}>Activity Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading devices...</Text>
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
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={(item, index) => {
          const deviceId = getDeviceId(item);
          return deviceId !== undefined && deviceId !== null ? deviceId.toString() : index.toString();
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="storage" size={34} color={theme.colors.gray2} />
            </View>
            <Text style={styles.emptyText}>No devices yet</Text>
            <Text style={styles.emptySubtext}>Add the first device for this room</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDevices(false)} />}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDevice ? 'Edit device' : 'New device'}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetForm} accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Device Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Living Room Light"
                placeholderTextColor={theme.colors.gray2}
                value={formData.device_name}
                onChangeText={(text) => setFormData({ ...formData, device_name: text })}
              />

              <Text style={styles.label}>Device Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.device_type}
                  onValueChange={(itemValue) => setFormData({ ...formData, device_type: itemValue })}
                  style={styles.picker}
                >
                  {deviceTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>



              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={handleSaveDevice}
                  activeOpacity={0.86}
                >
                  <Text style={styles.saveBtnText}>
                    {editingDevice ? 'Update' : 'Create'}
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
  deviceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  deviceType: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray2,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.card,
  },
  levelRow: {
    marginBottom: 16,
  },
  slider: {
    marginTop: 8,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  logsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  scheduleBtnText: {
    color: theme.colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gray2,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    flex: 1,
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: theme.colors.primary,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.gray2,
  },
  cancelBtnText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
