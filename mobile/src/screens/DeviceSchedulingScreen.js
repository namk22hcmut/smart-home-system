import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';
import { MaterialIcons } from '@expo/vector-icons';
import CustomSlider from '../components/CustomSlider';

const DeviceSchedulingScreen = ({ navigation }) => {
  const route = useRoute();
  const { device } = route.params || {};
  const { token } = useContext(AuthContext);
  
  // Extract device ID with fallback
  const deviceId = device?.device_id || device?.id;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    scheduled_time: '12:00',
    action_status: 'on',
    action_level: 50,
    days_of_week: '0,1,2,3,4,5,6', // All days by default
  });

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (device && deviceId) {
      loadSchedules();
    } else {
      console.warn('❌ Device parameter missing or invalid:', device);
      setLoading(false);
      Alert.alert('Error', 'Device information not available');
    }
  }, [device, deviceId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        `/devices/${deviceId}/schedules`,
        token
      );
      if (response.success) {
        setSchedules(response.schedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    try {
      if (!formData.scheduled_time || !formData.action_status) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const response = await apiService.post(
        `/devices/${deviceId}/schedules`,
        formData,
        token
      );

      if (response.success) {
        Alert.alert('Success', 'Schedule created successfully');
        setShowModal(false);
        resetForm();
        loadSchedules();
      } else {
        Alert.alert('Error', response.error || 'Failed to create schedule');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateSchedule = async (scheduleId) => {
    try {
      const response = await apiService.put(
        `/schedules/${scheduleId}`,
        formData,
        token
      );

      if (response.success) {
        Alert.alert('Success', 'Schedule updated successfully');
        setShowModal(false);
        setSelectedSchedule(null);
        resetForm();
        loadSchedules();
      } else {
        Alert.alert('Error', response.error || 'Failed to update schedule');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteSchedule = (scheduleId, scheduleName) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this schedule?`,
      [
        {
          text: 'Cancel',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await apiService.delete(
                `/schedules/${scheduleId}`,
                token
              );

              if (response.success) {
                Alert.alert('Success', 'Schedule deleted');
                loadSchedules();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      scheduled_time: schedule.scheduled_time.substring(0, 5),
      action_status: schedule.action_status,
      action_level: schedule.action_level || 50,
      days_of_week: schedule.days_of_week,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      scheduled_time: '12:00',
      action_status: 'on',
      action_level: 50,
      days_of_week: '0,1,2,3,4,5,6',
    });
    setSelectedSchedule(null);
  };

  const toggleDay = (dayIndex) => {
    const days = formData.days_of_week.split(',').map(d => parseInt(d));
    const index = days.indexOf(dayIndex);

    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(dayIndex);
    }

    days.sort();
    setFormData({
      ...formData,
      days_of_week: days.join(','),
    });
  };

  const getSelectedDays = () => {
    return formData.days_of_week.split(',').map(d => parseInt(d));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⏰ Device Schedule</Text>
        <Text style={styles.headerSubtitle}>{device?.device_name || device?.name || 'Device Scheduling'}</Text>
      </View>

      <ScrollView style={styles.content}>
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.schedule_id}
              schedule={schedule}
              onEdit={() => handleEditSchedule(schedule)}
              onDelete={() =>
                handleDeleteSchedule(
                  schedule.schedule_id,
                  schedule.scheduled_time
                )
              }
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="schedule" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No schedules set</Text>
            <Text style={styles.emptySubtext}>
              Create a schedule to automate your device
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Time Input */}
              <Text style={styles.fieldLabel}>Scheduled Time ⏰</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.scheduled_time}
                onChangeText={(text) =>
                  setFormData({ ...formData, scheduled_time: text })
                }
                maxLength={5}
              />

              {/* Action Status */}
              <Text style={styles.fieldLabel}>Action 🎛️</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.action_status === 'on' && styles.statusButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, action_status: 'on' })
                  }
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.action_status === 'on' &&
                      styles.statusButtonTextActive,
                    ]}
                  >
                    Turn ON
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.action_status === 'off' && styles.statusButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, action_status: 'off' })
                  }
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.action_status === 'off' &&
                      styles.statusButtonTextActive,
                    ]}
                  >
                    Turn OFF
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Level Slider (only if ON) */}
              {formData.action_status === 'on' && (
                <>
                  <Text style={styles.fieldLabel}>
                    Device Level: {formData.action_level}%
                  </Text>
                  <CustomSlider
                    min={0}
                    max={100}
                    value={formData.action_level}
                    onChange={(value) =>
                      setFormData({ ...formData, action_level: Math.round(value) })
                    }
                    style={styles.slider}
                  />
                </>
              )}

              {/* Days of Week */}
              <Text style={styles.fieldLabel}>Repeat On 📅</Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      getSelectedDays().includes(index) &&
                      styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        getSelectedDays().includes(index) &&
                        styles.dayButtonTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  if (selectedSchedule) {
                    handleUpdateSchedule(selectedSchedule.schedule_id);
                  } else {
                    handleAddSchedule();
                  }
                }}
              >
                <Text style={styles.saveButtonText}>
                  {selectedSchedule ? 'Update Schedule' : 'Create Schedule'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Schedule Card Component
const ScheduleCard = ({ schedule, onEdit, onDelete }) => {
  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDays = schedule.days_of_week
    .split(',')
    .map((d) => DAYS_OF_WEEK[parseInt(d)])
    .join(', ');

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleCardTop}>
        <View>
          <Text style={styles.scheduleTime}>{schedule.scheduled_time}</Text>
          <Text style={styles.scheduleAction}>
            {schedule.action_status === 'on' ? '✓ Turn ON' : '✗ Turn OFF'}
            {schedule.action_status === 'on' && ` @ ${schedule.action_level}%`}
          </Text>
        </View>
        <View style={styles.scheduleActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <MaterialIcons name="edit" size={20} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <MaterialIcons name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.scheduleDays}>{selectedDays}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  scheduleAction: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  scheduleDays: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#FF9800',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  dayButton: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#FF9800',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9800',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DeviceSchedulingScreen;
