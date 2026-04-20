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
      description: 'Create, disable, enable users',
      icon: '👥',
      color: '#3498db',
      action: () => navigation.navigate('UserManagement'),
    },
    {
      id: 'sharing',
      title: 'House Sharing',
      description: 'Manage house access & permissions',
      icon: '🏠',
      color: '#e74c3c',
      action: () => navigation.navigate('HouseSharing'),
    },
    {
      id: 'activity',
      title: 'Activity Logs',
      description: 'View system audit trail',
      icon: '📋',
      color: '#2ecc71',
      action: () => navigation.navigate('ActivityLogs'),
    },
    {
      id: 'stats',
      title: 'System Statistics',
      description: 'View analytics & metrics',
      icon: '📊',
      color: '#f39c12',
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
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {!loading && stats ? (
        <View style={styles.statsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
            <StatCard label="Users" value={stats.total_users} icon="👤" />
            <StatCard label="Admins" value={stats.admin_users} icon="🔑" />
            <StatCard label="Houses" value={stats.total_houses} icon="🏠" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <StatCard label="Devices" value={stats.total_devices} icon="🔌" />
            <StatCard label="Sensors" value={stats.total_sensors} icon="📡" />
            <StatCard label="Activity" value={stats.today_activity} icon="📊" />
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
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
              <Text style={styles.menuIcon}>{item.icon}</Text>
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
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  adminName: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 12,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#7f8c8d',
    fontSize: 14,
  },
  menuContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 4,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#bdc3c7',
    marginLeft: 12,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
    marginHorizontal: 12,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  versionText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
});
