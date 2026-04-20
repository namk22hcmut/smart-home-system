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
      if (response.data.success) {
        setStats(response.data.data);
        console.log('✅ Statistics loaded:', response.data.data);
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
      <Section title="👥 User Analytics" icon="👥">
        <StatRow label="Total Users" value={stats.total_users} color="#3498db" />
        <StatRow label="Active Users" value={stats.active_users} color="#2ecc71" />
        <StatRow label="Inactive Users" value={stats.total_users - stats.active_users} color="#e74c3c" />
        <StatRow label="Admin Users" value={stats.admin_users} color="#e67e22" />
      </Section>

      {/* Device Analytics */}
      <Section title="🔌 Device & Sensor Analytics" icon="🔌">
        <StatRow label="Total Houses" value={stats.total_houses} color="#9b59b6" />
        <StatRow label="Total Devices" value={stats.total_devices} color="#1abc9c" />
        <StatRow label="Total Sensors" value={stats.total_sensors} color="#16a085" />
      </Section>

      {/* Activity Analytics */}
      <Section title="📊 Activity Analytics" icon="📊">
        <StatRow label="Today's Activities" value={stats.today_activity} color="#f39c12" />
        <StatRow label="Device Level" value="0-100" color="#3498db" info="(Device Control Range)" />
      </Section>

      {/* System Information */}
      <Section title="ℹ️ System Information" icon="ℹ️">
        <InfoRow label="Database" value="SQLite" />
        <InfoRow label="API Version" value="1.0.0" />
        <InfoRow label="Admin Features" value="Enabled" />
      </Section>

      {/* Quick Stats Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>📋 Quick Summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="System Health"
            value="Good"
            icon="💚"
            bgColor="#d5f4e6"
            textColor="#27ae60"
          />
          <SummaryCard
            label="User Engagement"
            value={stats.active_users > 0 ? 'Active' : 'Inactive'}
            icon={stats.active_users > 0 ? '🟢' : '🔴'}
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
    backgroundColor: '#ecf0f1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sectionContent: {
    paddingVertical: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  statLabelContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  statInfo: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 4,
  },
  statValueBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
    marginHorizontal: 12,
    marginVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
  },
});
