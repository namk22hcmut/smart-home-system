/**
 * AdminPanel.js - Main Admin Dashboard
 * Role-based access control for system administrators
 */
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { apiService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function AdminPanel({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useContext(AuthContext);

  // Load system statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/stats');
      if (response && response.success) {
        setStats(response.data);
        console.log('✅ Admin stats loaded:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stats on mount (only once)
  useEffect(() => {
    if (user?.role === 'admin') {
      loadStats();
    }
  }, []);

  const handleLogout = async () => {
    console.log('🚪 Admin logout initiated');
    await signOut();
  };

  const menuItems = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      action: () => navigation.navigate('UserManagement'),
    },
    {
      id: 'sharing',
      title: 'House Sharing',
      description: 'Manage shared house access',
      action: () => navigation.navigate('HouseSharing'),
    },
    {
      id: 'activity',
      title: 'Activity Logs',
      description: 'View recent system activity',
      action: () => navigation.navigate('ActivityLogs'),
    },
    {
      id: 'stats',
      title: 'System Statistics',
      description: 'Analytics and usage overview',
      action: () => navigation.navigate('SystemStats'),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Admin Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Admin Panel</Text>
        <Text style={styles.adminName}>{user?.full_name || user?.username}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {!loading && stats ? (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard label="Users" value={stats.total_users} icon="👤" />
            <StatCard label="Admins" value={stats.admin_users} icon="🔑" />
            <StatCard label="Houses" value={stats.total_houses} icon="🏠" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Devices" value={stats.total_devices} icon="🔌" />
            <StatCard label="Sensors" value={stats.total_sensors} icon="📡" />
            <StatCard label="Activity" value={stats.today_activity} icon="📊" />
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>Admin Functions</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderLeftColor: item.color }]}
            onPress={item.action}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuDot} />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Smart Home Admin System</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

// Stat Card Component
function StatCard({ label, value, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCircle} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },

  header: {
    backgroundColor: '#111827',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  welcomeText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },

  adminName: {
    fontSize: 15,
    color: '#d1d5db',
    marginBottom: 22,
  },

  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  statsContainer: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  statCircle: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
    marginBottom: 12,
  },

  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 14,
    color: '#6b7280',
    fontSize: 14,
  },

  menuContainer: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 30,
  },

  menuTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },

  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 14,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  menuDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
    marginRight: 16,
  },

  menuTextContainer: {
    flex: 1,
  },

  menuItemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },

  menuItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },

  arrowIcon: {
    fontSize: 22,
    color: '#9ca3af',
    marginLeft: 10,
  },

  footer: {
    paddingBottom: 34,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 13,
    color: '#9ca3af',
  },

  versionText: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 4,
  },
});