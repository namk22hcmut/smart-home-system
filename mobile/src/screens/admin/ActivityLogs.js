/**
 * ActivityLogs.js - Admin Activity Logs Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiService } from '../../services/api';

export default function ActivityLogs({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Load activity logs
  const loadLogs = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get('/admin/activity-logs?limit=100');
      if (response.data.success) {
        setLogs(response.data.data);
        console.log('✅ Loaded', response.data.data.length, 'activity logs');
      }
    } catch (error) {
      console.error('❌ Error loading logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  // Get action icon and color
  const getActionStyle = (action) => {
    const actions = {
      user_disabled: { icon: '🔴', color: '#e74c3c' },
      user_enabled: { icon: '🟢', color: '#2ecc71' },
      user_role_changed: { icon: '🔑', color: '#3498db' },
      user_deleted: { icon: '🗑️', color: '#e67e22' },
      house_shared: { icon: '🏠', color: '#9b59b6' },
      stats_viewed: { icon: '📊', color: '#1abc9c' },
    };
    return actions[action] || { icon: '📋', color: '#7f8c8d' };
  };

  // Format timestamp
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Render log item
  const renderLogItem = ({ item }) => {
    const { icon, color } = getActionStyle(item.action);
    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => setSelectedLog(selectedLog?.log_id === item.log_id ? null : item)}
      >
        <View style={styles.logHeader}>
          <Text style={[styles.actionIcon, { color }]}>{icon}</Text>
          <View style={styles.logInfo}>
            <Text style={styles.action}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text style={styles.username}>User: {item.username || 'Unknown'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'success' ? '#d4edda' : '#f8d7da' }]}>
            <Text style={[styles.statusText, { color: item.status === 'success' ? '#155724' : '#856404' }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {selectedLog?.log_id === item.log_id && (
          <View style={styles.expandedDetails}>
            <DetailRow label="Resource Type" value={item.resource_type} />
            <DetailRow label="Resource ID" value={item.resource_id?.toString()} />
            <DetailRow label="IP Address" value={item.ip_address} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1abc9c" />
        <Text style={styles.loadingText}>Loading activity logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.log_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLogs(false)} />}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        }
      />
    </View>
  );
}

// Detail Row Component
function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  logInfo: {
    flex: 1,
  },
  action: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  username: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    color: '#2c3e50',
    flex: 1,
    textAlign: 'right',
  },
});
