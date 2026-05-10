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
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Schedule</Text>
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
            <View style={styles.emptyCircle} />
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
              <Text style={styles.fieldLabel}>Scheduled Time </Text>
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
              <Text style={styles.fieldLabel}>Action </Text>
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
              <Text style={styles.fieldLabel}>Repeat On </Text>
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
            {schedule.action_status === 'on' ? 'Turn ON' : 'Turn OFF'}
            {schedule.action_status === 'on' && ` @ ${schedule.action_level}%`}
          </Text>
        </View>
        <View style={styles.scheduleActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <MaterialIcons name="edit" size={20} color="#111827" />
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
    backgroundColor: '#f4f5f7',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },

  headerSubtitle: {
    fontSize: 15,
    color: '#d1d5db',
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  scheduleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  scheduleTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },

  scheduleAction: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 20,
  },

  scheduleActions: {
    flexDirection: 'row',
    gap: 6,
  },

  actionButton: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 12,
  },

  scheduleDays: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    lineHeight: 20,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,

    width: 60,
    height: 60,
    borderRadius: 999,

    backgroundColor: '#111827',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 22,
    paddingVertical: 22,

    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  modalContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },

  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    marginTop: 18,
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',

    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 14,

    fontSize: 15,
    color: '#111827',
  },

  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',

    borderRadius: 14,

    paddingVertical: 14,
    alignItems: 'center',

    backgroundColor: '#fff',
  },

  statusButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  statusButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },

  statusButtonTextActive: {
    color: '#fff',
  },

  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
    marginBottom: 12,
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },

  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: '#d1d5db',

    backgroundColor: '#fff',
  },

  dayButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  dayButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 13,
  },

  dayButtonTextActive: {
    color: '#fff',
  },

  saveButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 30,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DeviceSchedulingScreen;
