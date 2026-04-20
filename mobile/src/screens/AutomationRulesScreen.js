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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../services/api';

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
  
  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    logic_type: 'AND',
    action_device_id: '',
    action_status: 'on',
    action_level: '60',
    conditions: [{ sensor_type: 'temperature', operator: '>', threshold_value: '30' }]
  });

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
        Alert.alert('⚠️ Limit Reached', `Maximum ${MAX_CONDITIONS} conditions allowed`);
        return;
      }
      console.log('➕ Adding new condition');
      setFormData({
        ...formData,
        conditions: [
          ...currentConditions,
          { sensor_type: 'temperature', operator: '>', threshold_value: '30' }
        ]
      });
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
      setFormData({ ...formData, conditions: newConditions });
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
      setFormData({ ...formData, conditions: newConditions });
    } catch (error) {
      console.error('❌ Error updating condition:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      // Validate required fields
      console.log('📝 Form data before validation:', formData);
      
      if (!formData.rule_name?.trim()) {
        Alert.alert('Error', '❌ Rule name is required');
        return;
      }

      if (!formData.action_device_id || formData.action_device_id === '') {
        console.warn('❌ action_device_id:', formData.action_device_id);
        Alert.alert('Error', '❌ Please select an action device');
        return;
      }

      if (formData.conditions.length === 0) {
        Alert.alert('Error', '❌ Please add at least one condition');
        return;
      }

      // Validate each condition
      for (let i = 0; i < formData.conditions.length; i++) {
        const cond = formData.conditions[i];
        if (!cond.sensor_type || !cond.operator || cond.threshold_value === '' || cond.threshold_value === null) {
          Alert.alert('Error', `❌ Condition ${i + 1} is incomplete`);
          return;
        }
      }

      if (formData.action_status === 'on' && (!formData.action_level || formData.action_level === '')) {
        Alert.alert('Error', '❌ Please enter action level (0-100)');
        return;
      }

      const actionDeviceId = parseInt(formData.action_device_id);
      if (isNaN(actionDeviceId)) {
        console.error('❌ Invalid device ID:', formData.action_device_id);
        Alert.alert('Error', '❌ Invalid device selection');
        return;
      }

      console.log('📤 Creating rule with data:', {
        rule_name: formData.rule_name,
        logic_type: formData.logic_type,
        action_device_id: actionDeviceId,
        action_status: formData.action_status,
        action_level: parseInt(formData.action_level || 0),
        conditions: formData.conditions
      });

      let response;
      try {
        response = await apiService.post(
          `/rooms/${roomId}/automation-rules`,
          {
            rule_name: formData.rule_name,
            logic_type: formData.logic_type,
            action_device_id: actionDeviceId,
            action_status: formData.action_status,
            action_level: parseInt(formData.action_level || 0),
            conditions: formData.conditions.map(c => ({
              sensor_type: c.sensor_type,
              operator: c.operator,
              threshold_value: parseFloat(c.threshold_value)
            }))
          }
        );
      } catch (apiError) {
        console.error('❌ API Error creating rule:', apiError);
        const errorMsg = apiError?.response?.data?.error || 
                         apiError?.message || 
                         'Failed to create rule on server';
        Alert.alert('Server Error', errorMsg);
        return;
      }

      console.log('📥 Response:', response);

      if (response && response.success) {
        Alert.alert('Success', '✅ Rule created successfully');
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
        const errorMsg = response?.error || response?.message || 'Failed to create rule';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('❌ Unexpected error creating rule:', error);
      const errorMsg = error?.message || 'An unexpected error occurred';
      Alert.alert('Error', errorMsg);
    }
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
          `Rule: ${response.rule_name}\n\nConditions Met: ${conditionMet ? '✅ YES' : '❌ NO'}\n\nLogic Type: ${response.logic_type}`,
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
    setEditingRule(null);
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
          <Switch
            value={rule?.is_active ?? true}
            onValueChange={() => handleToggleRule(rule.rule_id, rule.is_active)}
          />
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
            🎯 Turn {rule.action_device_id ? `${actionDevice?.device_name || actionDevice?.name || 'Device'}` : 'Device'} {(rule.action_status || 'unknown').toUpperCase()}
            {rule.action_status === 'on' && ` (Level: ${rule.action_level}%)`}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={() => handleTestRule(rule.rule_id)}
          >
            <Text style={styles.buttonText}>🧪 Test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDeleteRule(rule.rule_id, rule.rule_name)}
          >
            <Text style={styles.buttonText}>🗑️ Delete</Text>
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

  const ConditionInput = ({ index, condition }) => {
    try {
      if (!condition) {
        console.warn(`⚠️ Condition ${index} is undefined`);
        return (
          <Text style={{ color: 'red', padding: 10 }}>
            Error: Condition data missing
          </Text>
        );
      }

      return (
        <View style={styles.conditionInput}>
          <Picker
            selectedValue={condition.sensor_type || 'temperature'}
            style={styles.picker}
            onValueChange={(value) => {
              console.log(`📝 Condition ${index}: sensor_type → ${value}`);
              updateCondition(index, 'sensor_type', value);
            }}
          >
            {SENSOR_TYPES.map(type => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>

          <Picker
            selectedValue={condition.operator || '>'}
            style={styles.picker}
            onValueChange={(value) => {
              console.log(`📝 Condition ${index}: operator → ${value}`);
              updateCondition(index, 'operator', value);
            }}
          >
            {OPERATORS.map(op => (
              <Picker.Item key={op} label={op} value={op} />
            ))}
          </Picker>

          <TextInput
            style={styles.input}
            placeholder="Value"
            value={String(condition.threshold_value || '')}
            onChangeText={(value) => {
              console.log(`📝 Condition ${index}: threshold_value → ${value}`);
              updateCondition(index, 'threshold_value', value);
            }}
            keyboardType="decimal-pad"
          />

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeCondition(index)}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    } catch (error) {
      console.error(`❌ Error rendering ConditionInput ${index}:`, error);
      return (
        <Text style={{ color: 'red', padding: 10 }}>
          Error rendering condition
        </Text>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        ListFooterComponent={
          showAddForm ? (
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formTitle}>Create New Rule</Text>

              {/* Rule Name */}
              <Text style={styles.label}>Rule Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smart Fan Control"
                value={formData.rule_name || ''}
                onChangeText={(value) => {
                  console.log('📝 Rule Name:', value);
                  setFormData({ ...formData, rule_name: value });
                }}
              />

              {/* Conditions */}
              <Text style={styles.label}>Conditions ({formData.logic_type})</Text>
              {(formData.conditions || []).map((cond, idx) => (
                <ConditionInput key={`cond-${idx}`} index={idx} condition={cond} />
              ))}

              <TouchableOpacity
                style={styles.addConditionButton}
                onPress={addCondition}
              >
                <Text style={styles.addConditionText}>+ Add Condition</Text>
              </TouchableOpacity>

              {/* Logic Type */}
              <Text style={styles.label}>Logic Type</Text>
              <Picker
                selectedValue={formData.logic_type}
                style={styles.picker}
                onValueChange={(value) => setFormData({ ...formData, logic_type: value })}
              >
                {LOGIC_TYPES.map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>

              {/* Action Device */}
              <Text style={styles.label}>Action Device</Text>
              <Picker
                selectedValue={formData.action_device_id}
                style={styles.picker}
                onValueChange={(value) => {
                  console.log('🎯 Selected device:', value);
                  setFormData({ ...formData, action_device_id: value });
                }}
              >
                <Picker.Item label="Select a device..." value="" />
                {devices.length > 0 ? (
                  devices.map(device => {
                    // Fallback to support both API response formats
                    const deviceId = device?.device_id || device?.id;
                    const deviceName = device?.device_name || device?.name || `Device ${deviceId}`;
                    console.log('🎯 Device option:', { device_id: deviceId, device_name: deviceName, device });
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

              {/* Action Status */}
              <Text style={styles.label}>Action Status</Text>
              <Picker
                selectedValue={formData.action_status}
                style={styles.picker}
                onValueChange={(value) => setFormData({ ...formData, action_status: value })}
              >
                <Picker.Item label="Turn ON" value="on" />
                <Picker.Item label="Turn OFF" value="off" />
              </Picker>

              {/* Action Level */}
              {formData.action_status === 'on' && (
                <>
                  <Text style={styles.label}>Device Level (0-100%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="60"
                    value={formData.action_level || ''}
                    onChangeText={(value) => {
                      console.log('📝 Action Level:', value);
                      setFormData({ ...formData, action_level: value });
                    }}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* Form Buttons */}
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateRule}
              >
                <Text style={styles.buttonText}>✓ Create Rule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null
        }
      />

      {!showAddForm && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  ruleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ruleCardDisabled: {
    opacity: 0.6,
    borderLeftColor: '#ccc',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  conditionsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  conditionText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    marginBottom: 4,
  },
  actionSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
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
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#fee',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 10,
    marginBottom: 80,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  conditionInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 4,
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#fee',
    borderRadius: 4,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addConditionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addConditionText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AutomationRulesScreen;
