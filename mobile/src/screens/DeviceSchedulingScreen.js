import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import apiService from '../services/api';

const DeviceSchedulesScreen = ({ navigation }) => {
  const route = useRoute();
  const { device } = route.params || {};

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    scheduled_time: '08:00',
    action_status: 'on',
    action_level: 75,
    duration_minutes: 0,
    days_of_week: '0,1,2,3,4,5,6',
    is_active: true,
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load schedules
  useEffect(() => {
    loadSchedules();
  }, [device]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        `/devices/${device.device_id}/schedules`
      );
      if (response.success && response.schedules) {
        setSchedules(response.schedules);
      }
    } catch (error) {
      console.log('[SCHEDULE-LOAD] Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      if (!formData.scheduled_time) {
        Alert.alert('Error', 'Please enter scheduled time');
        return;
      }

      const response = await apiService.post(
        `/devices/${device.device_id}/schedules`,
        formData
      );

      if (response.success) {
        Alert.alert('Success', response.message || 'Schedule created');
        setModalVisible(false);
        setFormData({
          scheduled_time: '08:00',
          action_status: 'on',
          action_level: 75,
          duration_minutes: 0,
          days_of_week: '0,1,2,3,4,5,6',
          is_active: true,
        });
        loadSchedules();
      } else {
        Alert.alert('Error', response.error || 'Failed to create schedule');
      }
    } catch (error) {
      console.log('[SCHEDULE-CREATE] Error:', error.message);
      Alert.alert('Error', error.message || 'Failed to create schedule');
    }
  };

  const handleUpdateSchedule = async () => {
    try {
      if (!editingSchedule) return;

      const updateData = { ...formData };
      const response = await apiService.put(
        `/schedules/${editingSchedule.schedule_id}`,
        updateData
      );

      if (response.success) {
        Alert.alert('Success', 'Schedule updated');
        setModalVisible(false);
        setEditingSchedule(null);
        loadSchedules();
      } else {
        Alert.alert('Error', response.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.log('[SCHEDULE-UPDATE] Error:', error.message);
      Alert.alert('Error', error.message || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = (schedule) => {
    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete this schedule?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await apiService.delete(
                `/schedules/${schedule.schedule_id}`
              );
              if (response.success) {
                Alert.alert('Success', 'Schedule deleted');
                loadSchedules();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      scheduled_time: schedule.scheduled_time || '08:00',
      action_status: schedule.action_status || 'on',
      action_level: schedule.action_level || 0,
      duration_minutes: schedule.duration_minutes || 0,
      days_of_week: schedule.days_of_week || '0,1,2,3,4,5,6',
      is_active: schedule.is_active !== false,
    });
    setModalVisible(true);
  };

  const toggleDay = (dayIndex) => {
    const days = formData.days_of_week.split(',').map(Number);
    const index = days.indexOf(dayIndex);

    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(dayIndex);
    }

    days.sort((a, b) => a - b);
    setFormData({
      ...formData,
      days_of_week: days.join(','),
    });
  };

  const getDaySelection = () => {
    return formData.days_of_week.split(',').map(Number);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          📅 Schedules for {device?.device_name}
        </Text>
      </View>

      {/* Add Schedule Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingSchedule(null);
          setFormData({
            scheduled_time: '08:00',
            action_status: 'on',
            action_level: 75,
            duration_minutes: 0,
            days_of_week: '0,1,2,3,4,5,6',
            is_active: true,
          });
          setModalVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>+ Add Schedule</Text>
      </TouchableOpacity>

      {/* Schedules List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : schedules.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📋 No schedules yet</Text>
          <Text style={styles.emptySubtext}>
            Create one to automate this device
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.schedulesList}>
          {schedules.map((schedule) => (
            <View key={schedule.schedule_id} style={styles.scheduleCard}>
              <View style={styles.scheduleInfo}>
                <View style={styles.timeRow}>
                  <Text style={styles.scheduleTime}>
                    ⏰ {schedule.scheduled_time}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      schedule.action_status === 'on'
                        ? styles.statusOn
                        : styles.statusOff,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {schedule.action_status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detail}>
                    💡 Level: {schedule.action_level}%
                  </Text>
                  <Text style={styles.detail}>
                    ⏱️ Duration:{' '}
                    {schedule.duration_minutes === 0
                      ? '∞'
                      : `${schedule.duration_minutes}m`}
                  </Text>
                </View>

                <View style={styles.daysRow}>
                  {dayLabels.map((day, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dayBadge,
                        schedule.days_of_week
                          ?.split(',')
                          .includes(index.toString())
                          ? styles.dayActive
                          : styles.dayInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          schedule.days_of_week
                            ?.split(',')
                            .includes(index.toString())
                            ? styles.dayTextActive
                            : styles.dayTextInactive,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={[
                    styles.activeStatus,
                    schedule.is_active ? styles.activeYes : styles.activeNo,
                  ]}
                >
                  {schedule.is_active ? '✓ Active' : '✗ Inactive'}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSchedule(schedule)}
                >
                  <Text style={styles.actionButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSchedule(schedule)}
                >
                  <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create/Edit Schedule Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSchedule ? '✏️ Edit Schedule' : '➕ Create Schedule'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Time Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Scheduled Time</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="HH:MM"
                  value={formData.scheduled_time}
                  onChangeText={(text) =>
                    setFormData({ ...formData, scheduled_time: text })
                  }
                />
                <Text style={styles.hint}>Example: 08:30 (24-hour format)</Text>
              </View>

              {/* Action Status */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Action</Text>
                <View style={styles.segmentButtons}>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      formData.action_status === 'on' && styles.segmentActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, action_status: 'on' })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        formData.action_status === 'on' &&
                          styles.segmentTextActive,
                      ]}
                    >
                      Turn ON
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      formData.action_status === 'off' && styles.segmentActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, action_status: 'off' })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        formData.action_status === 'off' &&
                          styles.segmentTextActive,
                      ]}
                    >
                      Turn OFF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Level */}
              {formData.action_status === 'on' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Level: {formData.action_level}%
                  </Text>
                  <View style={styles.levelInputGroup}>
                    <TouchableOpacity
                      onPress={() =>
                        setFormData({
                          ...formData,
                          action_level: Math.max(0, formData.action_level - 10),
                        })
                      }
                    >
                      <Text style={styles.levelButton}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.levelInput}
                      placeholder="0"
                      value={formData.action_level.toString()}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          action_level: Math.max(
                            0,
                            Math.min(100, parseInt(text) || 0)
                          ),
                        })
                      }
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setFormData({
                          ...formData,
                          action_level: Math.min(100, formData.action_level + 10),
                        })
                      }
                    >
                      <Text style={styles.levelButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0 for forever"
                  value={formData.duration_minutes.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      duration_minutes: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                />
                <Text style={styles.hint}>0 = device stays on, 30 = 30 minutes</Text>
              </View>

              {/* Days of Week */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Days of Week</Text>
                <View style={styles.daysGrid}>
                  {dayLabels.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayToggle,
                        getDaySelection().includes(index) &&
                          styles.dayToggleActive,
                      ]}
                      onPress={() => toggleDay(index)}
                    >
                      <Text
                        style={[
                          styles.dayToggleText,
                          getDaySelection().includes(index) &&
                            styles.dayToggleTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Switch */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Enable Schedule</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_active: value })
                    }
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={
                  editingSchedule ? handleUpdateSchedule : handleCreateSchedule
                }
              >
                <Text style={styles.saveButtonText}>
                  {editingSchedule ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 15,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    margin: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  schedulesList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  scheduleCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 6,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    elevation: 2,
  },
  scheduleInfo: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusOn: {
    backgroundColor: '#4CAF50',
  },
  statusOff: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detail: {
    fontSize: 12,
    color: '#666',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayBadge: {
    width: '12%',
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 4,
  },
  dayActive: {
    backgroundColor: '#2196F3',
  },
  dayInactive: {
    backgroundColor: '#e0e0e0',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayTextActive: {
    color: 'white',
  },
  dayTextInactive: {
    color: '#999',
  },
  activeStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  activeYes: {
    color: '#4CAF50',
  },
  activeNo: {
    color: '#f44336',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  modalBody: {
    padding: 16,
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  segmentButtons: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  segmentActive: {
    backgroundColor: '#2196F3',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  segmentTextActive: {
    color: 'white',
  },
  levelInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelButton: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    width: 40,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  levelInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    padding: 10,
    backgroundColor: 'white',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dayToggle: {
    width: '14%',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  dayToggleActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dayToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayToggleTextActive: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default DeviceSchedulesScreen;
