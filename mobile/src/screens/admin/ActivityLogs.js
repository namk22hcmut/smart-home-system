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
      if (response.success) {
        setLogs(response.data);
        console.log('✅ Loaded', response.data.length, 'activity logs');
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
      user_disabled: { icon: '●', color: '#dc2626' },
      user_enabled: { icon: '●', color: '#16a34a' },
      user_role_changed: { icon: '●', color: '#2563eb' },
      user_deleted: { icon: '●', color: '#ea580c' },
      house_shared: { icon: '●', color: '#7c3aed' },
      stats_viewed: { icon: '●', color: '#0891b2' },
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
    backgroundColor: '#f4f5f7',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },

  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },

  logCard: {
    backgroundColor: '#fff',

    borderRadius: 18,

    padding: 18,

    marginBottom: 14,

    shadowColor: '#000',
    shadowOpacity: 0.025,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginBottom: 10,
  },

  actionIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 1,
  },

  logInfo: {
    flex: 1,
    paddingRight: 12,
  },

  action: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },

  username: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  timestamp: {
    fontSize: 12,
    color: '#9ca3af',

    marginBottom: 10,
  },

  description: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },

  expandedDetails: {
    marginTop: 14,
    paddingTop: 14,

    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingVertical: 7,
  },

  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  detailValue: {
    fontSize: 12,
    color: '#111827',

    flex: 1,

    textAlign: 'right',

    marginLeft: 20,
  },
});