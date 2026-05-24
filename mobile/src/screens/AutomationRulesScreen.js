/**
 * Automation Rules Screen - Create and manage multi-condition rules
 * Example: IF (Temperature > 30 AND Humidity > 80) THEN Turn on Fan at 60%
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';
import { theme } from '../styles/theme';

const SENSOR_TYPES = ['temperature', 'humidity', 'light', 'motion', 'co2', 'pressure'];
const OPERATORS = ['>', '<', '>=', '<=', '==', '!='];
const LOGIC_TYPES = ['AND', 'OR'];

const AutomationRulesScreen = ({ route, navigation }) => {
  const { roomId, roomName } = route.params || {};
  
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [devices, setDevices] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    logic_type: 'AND',
    action_device_id: '',
    action_status: 'on',
    action_level: '60',
    conditions: [{ sensor_type: 'temperature', operator: '>', threshold_value: '30' }]
  });

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Automation',
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

  // Fetch rules and devices
  useEffect(() => {
    loadRulesAndDevices();
  }, [roomId]);

  const loadRulesAndDevices = async () => {
    try {
      setLoading(true);
      
      if (!roomId) {
        console.warn('No roomId provided to AutomationRulesScreen');
        setRules([]);
        setDevices([]);
        return;
      }
      
      // Fetch rules for this room
      console.log('📋 Loading automation rules for room:', roomId);
      const response = await apiService.get(`/rooms/${roomId}/automation-rules`);
      console.log('📋 Rules response:', response);
      if (response && response.success) {
        setRules(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'rules');
      } else {
        console.warn('❌ Rules fetch not successful:', response);
        setRules([]);
      }
      
      // Fetch devices in this room
      console.log('⚙️ Loading devices for room:', roomId);
      const devicesResponse = await apiService.get(`/rooms/${roomId}/devices`);
      console.log('⚙️ Devices response:', devicesResponse);
      if (devicesResponse && devicesResponse.success) {
        const devicesData = devicesResponse.data || [];
        console.log('⚙️ Devices data:', devicesData);
        if (devicesData.length > 0) {
          console.log('⚙️ First device:', devicesData[0]);
          console.log('⚙️ Device keys:', Object.keys(devicesData[0]));
        }
        setDevices(devicesData);
        console.log('✅ Loaded', devicesData.length, 'devices');
      } else {
        console.warn('❌ Devices fetch not successful:', devicesResponse);
        setDevices([]);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setRules([]);
      setDevices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRulesAndDevices().then(() => setRefreshing(false));
  }, [roomId]);

  const addCondition = () => {
    try {
      const MAX_CONDITIONS = 5;
      const currentConditions = formData.conditions || [];
      if (currentConditions.length >= MAX_CONDITIONS) {
        Alert.alert('Limit Reached', `Maximum ${MAX_CONDITIONS} conditions allowed`);
        return;
      }
      console.log('➕ Adding new condition');
      setFormData(prev => ({
        ...prev,
        conditions: [
          ...currentConditions,
          { sensor_type: 'temperature', operator: '>', threshold_value: '30' }
        ]
      }));
    } catch (error) {
      console.error('❌ Error adding condition:', error);
      Alert.alert('Error', 'Failed to add condition');
    }
  };

  const removeCondition = (index) => {
    try {
      const currentConditions = formData.conditions || [];
      if (index < 0 || index >= currentConditions.length) {
        console.warn(`⚠️ Invalid condition index to remove: ${index}, total: ${currentConditions.length}`);
        return;
      }
      console.log('➖ Removing condition', index);
      const newConditions = currentConditions.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, conditions: newConditions }));
    } catch (error) {
      console.error('❌ Error removing condition:', error);
      Alert.alert('Error', 'Failed to remove condition');
    }
  };

  const updateCondition = (index, field, value) => {
    try {
      const currentConditions = formData.conditions || [];
      if (index < 0 || index >= currentConditions.length) {
        console.warn(`⚠️ Invalid condition index: ${index}, total: ${currentConditions.length}`);
        return;
      }
      console.log(`📝 Updating condition ${index}.${field} → ${value}`);
      const newConditions = [...currentConditions];
      newConditions[index] = { ...newConditions[index], [field]: value };
      setFormData(prev => ({ ...prev, conditions: newConditions }));
    } catch (error) {
      console.error('❌ Error updating condition:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      // Validate required fields
      console.log('📝 Form data before validation:', formData);
      
      if (!formData.rule_name?.trim()) {
        Alert.alert('Error', 'Rule name is required');
        return;
      }

      if (!formData.action_device_id || formData.action_device_id === '') {
        console.warn('❌ action_device_id:', formData.action_device_id);
        Alert.alert('Error', 'Please select an action device');
        return;
      }

      if (formData.conditions.length === 0) {
        Alert.alert('Error', 'Please add at least one condition');
        return;
      }

      // Validate each condition
      for (let i = 0; i < formData.conditions.length; i++) {
        const cond = formData.conditions[i];
        if (!cond.sensor_type || !cond.operator || cond.threshold_value === '' || cond.threshold_value === null) {
          Alert.alert('Error', `Condition ${i + 1} is incomplete`);
          return;
        }
      }

      // Only require action_level when the selected action device is a fan
      const selectedActionDevice = devices.find(d => ((d.device_id || d.id) && (d.device_id || d.id).toString() === String(formData.action_device_id)));
      if (formData.action_status === 'on' && selectedActionDevice?.device_type === 'fan' && (!formData.action_level || formData.action_level === '')) {
        Alert.alert('Error', 'Please enter action level (0-100) for fan devices');
        return;
      }

      const actionDeviceId = parseInt(formData.action_device_id);
      if (isNaN(actionDeviceId)) {
        console.error('❌ Invalid device ID:', formData.action_device_id);
        Alert.alert('Error', 'Invalid device selection');
        return;
      }

      const payload = {
        rule_name: formData.rule_name,
        logic_type: formData.logic_type,
        action_device_id: actionDeviceId,
        action_status: formData.action_status,
        action_level: parseInt(formData.action_level || 0),
        conditions: formData.conditions
      };

      console.log(editingRuleId ? '📤 Updating rule with data:' : '📤 Creating rule with data:', payload);

      let response;
      try {
        const normalizedPayload = {
          ...payload,
          conditions: payload.conditions.map(c => ({
            sensor_type: c.sensor_type,
            operator: c.operator,
            threshold_value: parseFloat(c.threshold_value)
          }))
        };

        response = editingRuleId
          ? await apiService.put(`/automation-rules/${editingRuleId}`, normalizedPayload)
          : await apiService.post(`/rooms/${roomId}/automation-rules`, normalizedPayload);
      } catch (apiError) {
        console.error('❌ API Error saving rule:', apiError);
        const errorMsg = apiError?.response?.data?.error || 
                         apiError?.message || 
                         'Failed to save rule on server';
        Alert.alert('Server Error', errorMsg);
        return;
      }

      console.log('Response:', response);

      if (response && response.success) {
        Alert.alert('Success', editingRuleId ? 'Rule updated successfully' : 'Rule created successfully');
        setShowAddForm(false);
        resetForm();
        // Reload data safely
        try {
          await loadRulesAndDevices();
        } catch (reloadError) {
          console.error('❌ Error reloading data:', reloadError);
          // Still show success, just warn about reload error
        }
      } else {
        const errorMsg = response?.error || response?.message || 'Failed to save rule';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('❌ Unexpected error saving rule:', error);
      const errorMsg = error?.message || 'An unexpected error occurred';
      Alert.alert('Error', errorMsg);
    }
  };

  const handleEditRule = (rule) => {
    if (!rule) return;

    setEditingRuleId(rule.rule_id);
    setFormData({
      rule_name: rule.rule_name || '',
      logic_type: rule.logic_type || 'AND',
      action_device_id: rule.action_device_id ? String(rule.action_device_id) : '',
      action_status: rule.action_status || 'on',
      action_level: String(rule.action_level ?? 60),
      conditions: Array.isArray(rule.conditions) && rule.conditions.length > 0
        ? rule.conditions.map((cond) => ({
            sensor_type: cond.sensor_type || 'temperature',
            operator: cond.operator || '>',
            threshold_value: String(cond.threshold_value ?? '30'),
          }))
        : [{ sensor_type: 'temperature', operator: '>', threshold_value: '30' }],
    });
    setShowAddForm(true);
  };

  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      const response = await apiService.post(`/automation-rules/${ruleId}/toggle`, {});
      if (response && response.success) {
        setRules(rules.map(r => r.rule_id === ruleId ? response.rule : r));
        Alert.alert('Success', response.message || 'Rule toggled');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle rule');
    }
  };

  const handleTestRule = async (ruleId) => {
    try {
      const response = await apiService.post(`/automation-rules/${ruleId}/test`, {});
      if (response && response.success) {
        const conditionMet = response.conditions_met;
        Alert.alert(
          'Test Result',
          `Rule: ${response.rule_name}\n\nConditions Met: ${conditionMet ? 'Yes' : 'No'}\n\nLogic Type: ${response.logic_type}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test rule');
    }
  };

  const handleDeleteRule = (ruleId, ruleName) => {
    Alert.alert(
      'Delete Rule',
      `Are you sure you want to delete "${ruleName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/automation-rules/${ruleId}`);
            if (response && response.success) {
                setRules(rules.filter(r => r.rule_id !== ruleId));
                Alert.alert('Success', 'Rule deleted');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete rule');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      logic_type: 'AND',
      action_device_id: '',
      action_status: 'on',
      action_level: '60',
      conditions: [{ sensor_type: 'temperature', operator: '>', threshold_value: '30' }]
    });
    setEditingRuleId(null);
  };
  const RuleCard = ({ rule }) => {
    try {
      // Fallback support for both API response formats
      const actionDevice = devices.find(d => {
        const deviceId = d.device_id || d.id;
        return deviceId === rule.action_device_id;
      });
      
      if (!rule) {
        console.warn('⚠️ Rule is null');
        return null;
      }
      
      return (
        <View style={[styles.ruleCard, !(rule?.is_active ?? true) && styles.ruleCardDisabled]}>
          <View style={styles.ruleHeader}>
          <Text style={styles.ruleName}>{rule?.rule_name || 'Unnamed Rule'}</Text>
          <View style={styles.ruleHeaderActions}>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => handleEditRule(rule)}
              accessibilityLabel="Edit rule"
            >
              <MaterialIcons name="edit" size={18} color={theme.colors.gray1} />
            </TouchableOpacity>
            <Switch
              value={rule?.is_active ?? true}
              onValueChange={() => handleToggleRule(rule.rule_id, rule.is_active)}
            />
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.conditionsSection}>
          <Text style={styles.sectionLabel}>
            Conditions ({rule.logic_type}):
          </Text>
          {(rule.conditions || []).map((cond, idx) => (
            <Text key={idx} style={styles.conditionText}>
              • {cond?.sensor_type || 'unknown'} {cond?.operator || '?'} {cond?.threshold_value || 'N/A'}
            </Text>
          ))}
        </View>

        {/* Action */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionLabel}>Action:</Text>
          <Text style={styles.actionText}>
            Turn {rule.action_device_id ? `${actionDevice?.device_name || actionDevice?.name || 'Device'}` : 'Device'} {(rule.action_status || 'unknown').toUpperCase()}
            {actionDevice?.device_type === 'fan' && rule.action_status === 'on' && ` (Level: ${rule.action_level}%)`}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={() => handleTestRule(rule.rule_id)}
          >
            <Text style={styles.buttonText}>Test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDeleteRule(rule.rule_id, rule.rule_name)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      );
    } catch (error) {
      console.error('❌ Error rendering RuleCard:', error);
      return (
        <View style={styles.ruleCard}>
          <Text style={{ color: 'red' }}>Error rendering rule</Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  // Determine selected action device from the form for conditional UI
  const selectedActionDevice = devices.find(d => ((d.device_id || d.id) && (d.device_id || d.id).toString() === String(formData.action_device_id)));

  return (
    <View style={styles.container}>
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{roomName || 'Automation'}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setShowAddForm(true);
          }}
          activeOpacity={0.86}
          disabled={showAddForm}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.card} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rules}
        renderItem={({ item }) => <RuleCard rule={item} />}
        keyExtractor={(item) => (item?.rule_id || '').toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No automation rules yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create one</Text>
          </View>
        }
      />

      <Modal visible={showAddForm} transparent animationType="slide" onRequestClose={() => {
        setShowAddForm(false);
        resetForm();
      }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingRuleId ? 'Edit Rule' : 'Create New Rule'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} contentContainerStyle={styles.formScrollContent}>
              <Text style={styles.label}>Rule Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smart Fan Control"
                value={formData.rule_name || ''}
                onChangeText={(value) => {
                  console.log('📝 Rule Name:', value);
                  setFormData(prev => ({ ...prev, rule_name: value }));
                }}
              />

              <Text style={styles.label}>Conditions ({formData.logic_type})</Text>
              {(formData.conditions || []).map((cond, idx) => (
                <View key={`cond-${idx}`} style={styles.conditionInput}>
                  <Picker
                    selectedValue={cond?.sensor_type || 'temperature'}
                    style={styles.picker}
                    onValueChange={(value) => {
                      console.log(`📝 Condition ${idx}: sensor_type → ${value}`);
                      updateCondition(idx, 'sensor_type', value);
                    }}
                  >
                    {SENSOR_TYPES.map(type => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>

                  <Picker
                    selectedValue={cond?.operator || '>'}
                    style={styles.picker}
                    onValueChange={(value) => {
                      console.log(`📝 Condition ${idx}: operator → ${value}`);
                      updateCondition(idx, 'operator', value);
                    }}
                  >
                    {OPERATORS.map(op => (
                      <Picker.Item key={op} label={op} value={op} />
                    ))}
                  </Picker>

                  <TextInput
                    style={styles.input}
                    placeholder="Value"
                    value={String(cond?.threshold_value ?? '')}
                    onChangeText={(value) => {
                      console.log(`📝 Condition ${idx}: threshold_value → ${value}`);
                      updateCondition(idx, 'threshold_value', value);
                    }}
                    keyboardType="decimal-pad"
                  />

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCondition(idx)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addConditionButton} onPress={addCondition}>
                <Text style={styles.addConditionText}>+ Add Condition</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Logic Type</Text>
              <Picker
                selectedValue={formData.logic_type}
                style={styles.picker}
                onValueChange={(value) => setFormData(prev => ({ ...prev, logic_type: value }))}
              >
                {LOGIC_TYPES.map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>

              <Text style={styles.label}>Action Device</Text>
              <Picker
                selectedValue={formData.action_device_id}
                style={styles.picker}
                onValueChange={(value) => {
                  console.log('🎯 Selected device:', value);
                  setFormData(prev => ({ ...prev, action_device_id: value }));
                }}
              >
                <Picker.Item label="Select a device..." value="" />
                {devices.length > 0 ? (
                  devices.map(device => {
                    const deviceId = device?.device_id || device?.id;
                    const deviceName = device?.device_name || device?.name || `Device ${deviceId}`;
                    return (
                      <Picker.Item
                        key={deviceId}
                        label={deviceName}
                        value={(deviceId || '').toString()}
                      />
                    );
                  })
                ) : (
                  <Picker.Item label="No devices available" value="" disabled />
                )}
              </Picker>

              <Text style={styles.label}>Action Status</Text>
              <Picker
                selectedValue={formData.action_status}
                style={styles.picker}
                onValueChange={(value) => setFormData(prev => ({ ...prev, action_status: value }))}
              >
                <Picker.Item label="Turn ON" value="on" />
                <Picker.Item label="Turn OFF" value="off" />
              </Picker>

              {formData.action_status === 'on' && selectedActionDevice?.device_type === 'fan' && (
                <>
                  <Text style={styles.label}>Device Level (0-100%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="60"
                    value={formData.action_level || ''}
                    onChangeText={(value) => {
                      console.log('📝 Action Level:', value);
                      setFormData(prev => ({ ...prev, action_level: value }));
                    }}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.createButton]}
                  onPress={handleCreateRule}
                >
                  <Text style={styles.buttonText}>{editingRuleId ? 'Save Changes' : 'Create Rule'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray1,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.gray2,
    marginTop: 8,
  },
  ruleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  ruleCardDisabled: {
    opacity: 0.6,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    flex: 1,
  },
  conditionsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gray1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  conditionText: {
    fontSize: 14,
    color: theme.colors.gray1,
    marginLeft: 8,
    marginBottom: 4,
  },
  actionSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray2,
  },
  actionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.accent,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.gray2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    flex: 1,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScrollContent: {
    paddingBottom: 24,
  },
  formContainer: {
    backgroundColor: theme.colors.card,
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray1,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  picker: {
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  conditionInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    gap: 4,
  },
  removeButton: {
    padding: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  removeButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  addConditionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addConditionText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    marginTop: 0,
  },
  cancelButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 0,
  },
  cancelButtonText: {
    color: theme.colors.primary,
  },
});

export default AutomationRulesScreen;
