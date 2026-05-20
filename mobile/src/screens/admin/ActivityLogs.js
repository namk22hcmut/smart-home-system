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
import { theme } from '../../styles/theme';
import { formatRelative } from '../../utils/time';

export default function ActivityLogs({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Activity Logs',
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
      user_disabled: { icon: '●', color: theme.colors.primary },
      user_enabled: { icon: '●', color: theme.colors.primary },
      user_role_changed: { icon: '◆', color: theme.colors.accent },
      user_deleted: { icon: '×', color: theme.colors.accent },
      house_shared: { icon: '⬟', color: theme.colors.primary },
      stats_viewed: { icon: '◫', color: theme.colors.primary },
    };
    return actions[action] || { icon: '•', color: theme.colors.gray2 };
  };

  // Use shared relative formatter

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
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.statusText, { color: item.status === 'success' ? theme.colors.primary : theme.colors.accent }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.timestamp}>{formatRelative(item.created_at)}</Text>

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.gray1,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray2,
  },
  logCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
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
    color: theme.colors.text,
  },
  username: {
    fontSize: 12,
    color: theme.colors.gray1,
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
    color: theme.colors.gray2,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: theme.colors.gray1,
    fontStyle: 'italic',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.gray1,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
});
