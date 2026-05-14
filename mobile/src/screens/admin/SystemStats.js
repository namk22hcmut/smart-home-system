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
import { theme } from '../../styles/theme';

export default function SystemStats({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'System Stats',
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <StatRow label="Total Users" value={stats.total_users} color={theme.colors.primary} />
        <StatRow label="Active Users" value={stats.active_users} color={theme.colors.primary} />
        <StatRow label="Inactive Users" value={stats.total_users - stats.active_users} color={theme.colors.accent} />
        <StatRow label="Admin Users" value={stats.admin_users} color={theme.colors.accent} />
      </Section>

      {/* Device Analytics */}
      <Section title="🔌 Device & Sensor Analytics" icon="🔌">
        <StatRow label="Total Houses" value={stats.total_houses} color={theme.colors.primary} />
        <StatRow label="Total Devices" value={stats.total_devices} color={theme.colors.primary} />
        <StatRow label="Total Sensors" value={stats.total_sensors} color={theme.colors.primary} />
      </Section>

      {/* Activity Analytics */}
      <Section title="📊 Activity Analytics" icon="📊">
        <StatRow label="Today's Activities" value={stats.today_activity} color={theme.colors.primary} />
        <StatRow label="Device Level" value="0-100" color={theme.colors.accent} info="(Device Control Range)" />
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
            bgColor={theme.colors.card}
            textColor={theme.colors.primary}
          />
          <SummaryCard
            label="User Engagement"
            value={stats.active_users > 0 ? 'Active' : 'Inactive'}
            icon={stats.active_users > 0 ? '●' : '•'}
            bgColor={theme.colors.card}
            textColor={stats.active_users > 0 ? theme.colors.primary : theme.colors.accent}
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
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.card,
    backgroundColor: theme.colors.primary,
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
    borderBottomColor: theme.colors.gray2,
  },
  statLabelContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  statInfo: {
    fontSize: 11,
    color: theme.colors.gray2,
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
    borderBottomColor: theme.colors.gray2,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.gray1,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
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
    color: theme.colors.gray1,
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
    borderTopColor: theme.colors.gray2,
    marginHorizontal: 12,
    marginVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.gray2,
  },
});
