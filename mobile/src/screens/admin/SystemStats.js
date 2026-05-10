/**
 * SystemStats.js - System Statistics Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiService } from '../../services/api';

export default function SystemStats({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load statistics
  const loadStats = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get('/admin/stats');
      if (response.success) {
        setStats(response.data);
        console.log('✅ Statistics loaded:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f39c12" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Failed to load statistics</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats(false)} />}
      showsVerticalScrollIndicator={false}
    >
      {/* User Analytics */}
      <Section title="User Analytics">
        <StatRow label="Total Users" value={stats.total_users} color="#111827" />
        <StatRow label="Active Users" value={stats.active_users} color="#374151" />
        <StatRow label="Inactive Users" value={stats.total_users - stats.active_users} color="#6b7280" />
        <StatRow label="Admin Users" value={stats.admin_users} color="#e67e22" />
      </Section>

      {/* Device Analytics */}
      <Section title="Device & Sensor Analytics">
        <StatRow label="Total Houses" value={stats.total_houses} color="#111827" />
        <StatRow label="Total Devices" value={stats.total_devices} color="#1abc9c" />
        <StatRow label="Total Sensors" value={stats.total_sensors} color="#16a085" />
      </Section>

      {/* Activity Analytics */}
      <Section title="Activity Analytics">
        <StatRow label="Today's Activities" value={stats.today_activity} color="#f39c12" />
        <StatRow label="Device Level" value="0-100" color="#111827" info="(Device Control Range)" />
      </Section>

      {/* System Information */}
      <Section title="System Information">
        <InfoRow label="Database" value="SQLite" />
        <InfoRow label="API Version" value="1.0.0" />
        <InfoRow label="Admin Features" value="Enabled" />
      </Section>

      {/* Quick Stats Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Quick Summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="System Health"
            value="Good"
            icon="●"
            bgColor="#d5f4e6"
            textColor="#27ae60"
          />
          <SummaryCard
            label="User Engagement"
            value={stats.active_users > 0 ? 'Active' : 'Inactive'}
            icon="●"
            bgColor={stats.active_users > 0 ? '#d5f4e6' : '#fadbd8'}
            textColor={stats.active_users > 0 ? '#27ae60' : '#c0392b'}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Last Updated: {new Date().toLocaleTimeString()}</Text>
      </View>
    </ScrollView>
  );
}

// Section Component
function Section({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

// Stat Row Component
function StatRow({ label, value, color, info }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelContainer}>
        <Text style={styles.statLabel}>{label}</Text>
        {info && <Text style={styles.statInfo}>{info}</Text>}
      </View>
      <View style={[styles.statValueBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// Info Row Component
function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Summary Card Component
function SummaryCard({ label, value, icon, bgColor, textColor }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bgColor }]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: textColor }]}>{value}</Text>
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

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },

  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },

  section: {
    backgroundColor: '#fff',

    marginHorizontal: 16,
    marginTop: 16,

    borderRadius: 20,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.025,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',

    color: '#111827',

    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,

    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  sectionContent: {
    paddingVertical: 4,
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 18,
    paddingVertical: 14,

    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },

  statLabelContainer: {
    flex: 1,
    paddingRight: 10,
  },

  statLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  statInfo: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },

  statValueBadge: {
    minWidth: 56,

    paddingVertical: 8,
    paddingHorizontal: 14,

    borderRadius: 999,

    alignItems: 'center',
  },

  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 18,
    paddingVertical: 14,

    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },

  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },

  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  summarySection: {
    backgroundColor: '#fff',

    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,

    borderRadius: 20,

    padding: 18,

    shadowColor: '#000',
    shadowOpacity: 0.025,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',

    marginBottom: 16,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  summaryCard: {
    flex: 1,

    borderRadius: 18,

    paddingVertical: 20,
    paddingHorizontal: 16,

    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryIcon: {
    fontSize: 20,
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',

    marginBottom: 6,

    textAlign: 'center',
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});