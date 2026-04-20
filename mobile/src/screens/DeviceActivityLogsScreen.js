import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';
import { MaterialIcons } from '@expo/vector-icons';

const DeviceActivityLogsScreen = ({ navigation }) => {
  const route = useRoute();
  const { device } = route.params || {};
  const { token } = useContext(AuthContext);

  // Extract device ID with fallback
  const deviceId = device?.device_id || device?.id;

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [triggeredByFilter, setTriggeredByFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (device && deviceId) {
      loadActivityData();
    } else {
      console.warn('❌ Device parameter missing or invalid:', device);
      setLoading(false);
    }
  }, [device, deviceId]);

  const loadActivityData = async () => {
    try {
      setLoading(true);

      // Build query string with filters
      let queryString = `?limit=${limit}&offset=${offset}`;
      if (searchText) queryString += `&search=${encodeURIComponent(searchText)}`;
      if (actionFilter) queryString += `&action=${actionFilter}`;
      if (triggeredByFilter) queryString += `&triggered_by=${triggeredByFilter}`;
      if (startDate) queryString += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) queryString += `&end_date=${encodeURIComponent(endDate)}`;

      // Get logs
      const logsResponse = await apiService.get(
        `/devices/${deviceId}/activity-logs${queryString}`,
        token
      );
      if (logsResponse.success) {
        if (offset === 0) {
          setLogs(logsResponse.logs);
        } else {
          setLogs([...logs, ...logsResponse.logs]);
        }
      }

      // Get summary
      const summaryResponse = await apiService.get(
        `/devices/${deviceId}/activity-summary`,
        token
      );
      if (summaryResponse.success) {
        setSummary(summaryResponse);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    await loadActivityData();
    setRefreshing(false);
  };

  const loadMore = () => {
    setOffset(offset + limit);
    loadActivityData();
  };

  const applyFilters = () => {
    setOffset(0);
    setShowFilters(false);
    loadActivityData();
  };

  const clearFilters = () => {
    setSearchText('');
    setActionFilter('');
    setTriggeredByFilter('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'turn_on':
        return '#4CAF50';
      case 'turn_off':
        return '#F44336';
      case 'set_level':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'turn_on':
        return 'power-settings-new';
      case 'turn_off':
        return 'power-off';
      case 'set_level':
        return 'tune';
      default:
        return 'info';
    }
  };

  const getTriggeredByIcon = (triggeredBy) => {
    switch (triggeredBy) {
      case 'user':
        return '👤';
      case 'automation_rule':
        return '🤖';
      case 'schedule':
        return '⏰';
      case 'mqtt':
        return '☁️';
      default:
        return '❓';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatShortTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Activity Logs</Text>
        <Text style={styles.headerSubtitle}>{device?.device_name || device?.name || 'Activity Logs'}</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#2196F3" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
        {(searchText || actionFilter || triggeredByFilter || startDate || endDate) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              clearFilters();
              setOffset(0);
              loadActivityData();
            }}
          >
            <MaterialIcons name="clear" size={18} color="#F44336" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Filter Logs</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Search Box */}
              <Text style={styles.filterLabel}>Search Reason</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="e.g., 'User turned on manually'"
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#999"
              />

              {/* Action Filter */}
              <Text style={styles.filterLabel}>Action Type</Text>
              <View style={styles.filterOptions}>
                {['turn_on', 'turn_off', 'set_level'].map((action) => (
                  <TouchableOpacity
                    key={action}
                    style={[
                      styles.filterOption,
                      actionFilter === action && styles.filterOptionActive,
                    ]}
                    onPress={() =>
                      setActionFilter(actionFilter === action ? '' : action)
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        actionFilter === action &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {action.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Triggered By Filter */}
              <Text style={styles.filterLabel}>Triggered By</Text>
              <View style={styles.filterOptions}>
                {['user', 'automation_rule', 'schedule', 'mqtt'].map(
                  (trigger) => (
                    <TouchableOpacity
                      key={trigger}
                      style={[
                        styles.filterOption,
                        triggeredByFilter === trigger &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setTriggeredByFilter(
                          triggeredByFilter === trigger ? '' : trigger
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          triggeredByFilter === trigger &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {trigger.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Date Range */}
              <Text style={styles.filterLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-01-15"
                value={startDate}
                onChangeText={setStartDate}
                placeholderTextColor="#999"
              />

              <Text style={styles.filterLabel}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-04-17"
                value={endDate}
                onChangeText={setEndDate}
                placeholderTextColor="#999"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Today's Summary</Text>
            <View style={styles.summaryGrid}>
              <SummaryItem
                label="Turned On"
                value={summary.today_turn_on}
                color="#4CAF50"
              />
              <SummaryItem
                label="Turned Off"
                value={summary.today_turn_off}
                color="#F44336"
              />
              <SummaryItem
                label="Total Actions"
                value={summary.today_total_actions}
                color="#2196F3"
              />
            </View>

            {summary.last_action && (
              <View style={styles.lastActionContainer}>
                <Text style={styles.lastActionLabel}>Last Action:</Text>
                <Text style={styles.lastActionTime}>
                  {formatTime(summary.last_action.timestamp)}
                </Text>
                <Text style={styles.lastActionReason}>
                  {summary.last_action.reason}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Activity Logs */}
        <View style={styles.logsSection}>
          <Text style={styles.logsTitle}>Activity History</Text>

          {logs.length > 0 ? (
            <>
              {logs.map((log) => (
                <ActivityLogItem key={log.log_id} log={log} />
              ))}

              {logs.length >= limit && (
                <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No activity logs</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Summary Item Component
const SummaryItem = ({ label, value, color }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryItemValue, { color }]}>{value}</Text>
    <Text style={styles.summaryItemLabel}>{label}</Text>
  </View>
);

// Activity Log Item Component
const ActivityLogItem = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const getTriggeredByIcon = (triggeredBy) => {
    switch (triggeredBy) {
      case 'user':
        return '👤';
      case 'automation_rule':
        return '🤖';
      case 'schedule':
        return '⏰';
      case 'mqtt':
        return '☁️';
      default:
        return '❓';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'turn_on':
        return '#4CAF50';
      case 'turn_off':
        return '#F44336';
      case 'set_level':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  const getActionDisplay = (log) => {
    switch (log.action) {
      case 'turn_on':
        return 'Turned ON';
      case 'turn_off':
        return 'Turned OFF';
      case 'set_level':
        return `Level: ${log.old_level}% → ${log.new_level}%`;
      default:
        return log.action;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatShortTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.logItem}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.logItemHeader}>
          <View style={styles.logItemLeft}>
            <Text style={styles.logTime}>
              {formatShortTime(log.timestamp)}
            </Text>
            <Text
              style={[
                styles.logAction,
                { color: getActionColor(log.action) },
              ]}
            >
              {getActionDisplay(log)}
            </Text>
          </View>

          <View style={styles.logItemRight}>
            <Text style={styles.logTrigger}>
              {getTriggeredByIcon(log.triggered_by)}
            </Text>
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={20}
              color="#999"
            />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.logItemDetails}>
          <DetailRow
            label="Full Time"
            value={formatTime(log.timestamp)}
          />
          <DetailRow
            label="Action"
            value={log.action.toUpperCase()}
          />
          <DetailRow
            label="Triggered By"
            value={log.triggered_by}
          />

          {log.old_status && log.new_status && (
            <DetailRow
              label="Status"
              value={`${log.old_status} → ${log.new_status}`}
            />
          )}

          {log.old_level !== null && log.new_level !== null && (
            <DetailRow
              label="Level"
              value={`${log.old_level}% → ${log.new_level}%`}
            />
          )}

          {log.reason && (
            <DetailRow
              label="Reason"
              value={log.reason}
            />
          )}

          {log.user_id && (
            <DetailRow
              label="User ID"
              value={log.user_id}
            />
          )}
        </View>
      )}
    </View>
  );
};

// Detail Row Component
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

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
    backgroundColor: '#2196F3',
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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lastActionContainer: {
    marginTop: 8,
  },
  lastActionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  lastActionTime: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  lastActionReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  logsSection: {
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  logItemLeft: {
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  logItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTrigger: {
    fontSize: 16,
  },
  logItemDetails: {
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    minWidth: '35%',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  // Filter styles
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    gap: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FAFAFA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DeviceActivityLogsScreen;
