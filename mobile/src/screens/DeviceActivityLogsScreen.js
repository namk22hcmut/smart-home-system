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
        return '#111827';
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
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <Text style={styles.headerSubtitle}>{device?.device_name || device?.name || 'Activity Logs'}</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#111827" />
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
              <Text style={styles.modalTitle}>Filter Logs</Text>
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
                color="#111827"
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
              <View style={styles.emptyCircle} />
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
        return 'User';

      case 'automation_rule':
        return 'Automation';

      case 'schedule':
        return 'Schedule';

      case 'mqtt':
        return 'Cloud';

      default:
        return 'System';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'turn_on':
        return '#4CAF50';
      case 'turn_off':
        return '#F44336';
      case 'set_level':
        return '#111827';
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

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,

    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    backgroundColor: '#fff',

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 14,
  },

  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    backgroundColor: '#fff',

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 14,
  },

  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    paddingBottom: 18,
    marginBottom: 18,

    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  summaryItemValue: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 6,
  },

  summaryItemLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  lastActionContainer: {
    marginTop: 6,
  },

  lastActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  lastActionTime: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },

  lastActionReason: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  logsSection: {
    paddingBottom: 30,
  },

  logsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },

  logItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 14,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  logItemLeft: {
    flex: 1,
  },

  logTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },

  logAction: {
    fontSize: 15,
    fontWeight: '700',
  },

  logItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logTrigger: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',

    backgroundColor: '#f3f4f6',

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 999,
    overflow: 'hidden',
  },

  logItemDetails: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',

    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  detailRow: {
    marginBottom: 14,
  },

  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
    fontWeight: '600',
  },

  detailValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 22,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 90,
  },

  emptyCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  loadMoreButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },

  loadMoreText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
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

  modalBody: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },

  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 18,
    marginBottom: 10,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',

    backgroundColor: '#f9fafb',

    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 14,

    fontSize: 15,
    color: '#111827',
  },

  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',

    backgroundColor: '#f9fafb',

    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 14,

    fontSize: 15,
    color: '#111827',
  },

  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: '#d1d5db',

    backgroundColor: '#fff',
  },

  filterOptionActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  filterOptionText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },

  filterOptionTextActive: {
    color: '#fff',
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,

    paddingHorizontal: 22,
    paddingVertical: 22,

    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  cancelButton: {
    flex: 1,

    borderWidth: 1,
    borderColor: '#d1d5db',

    borderRadius: 14,

    paddingVertical: 14,

    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },

  applyButton: {
    flex: 1,

    backgroundColor: '#111827',

    borderRadius: 14,

    paddingVertical: 14,

    alignItems: 'center',
  },

  applyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default DeviceActivityLogsScreen;
