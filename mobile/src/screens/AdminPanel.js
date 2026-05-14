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
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../styles/theme';

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Admin',
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.card,
      headerTitleStyle: {
        fontWeight: '700',
        color: theme.colors.card,
      },
      headerRight: () => (
        <TouchableOpacity style={styles.headerLogoutButton} onPress={handleLogout}>
          <Text style={styles.headerLogoutText}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, user]);

  const handleLogout = async () => {
    console.log('🚪 Admin logout initiated');
    await signOut();
  };

  const menuItems = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Create, disable, enable users',
      icon: 'Users',
      color: theme.colors.primary,
      action: () => navigation.navigate('UserManagement'),
    },
    {
      id: 'sharing',
      title: 'House Sharing',
      description: 'Manage house access & permissions',
      icon: 'House',
      color: theme.colors.primary,
      action: () => navigation.navigate('HouseSharing'),
    },
    {
      id: 'activity',
      title: 'Activity Logs',
      description: 'View system audit trail',
      icon: 'Logs',
      color: theme.colors.primary,
      action: () => navigation.navigate('ActivityLogs'),
    },
    {
      id: 'stats',
      title: 'System Statistics',
      description: 'View analytics & metrics',
      icon: 'Stats',
      color: theme.colors.primary,
      action: () => navigation.navigate('SystemStats'),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Admin Panel</Text>
        <Text style={styles.adminName}>{user?.full_name || user?.username}</Text>
      </View>

      {/* Stats Overview */}
      {!loading && stats ? (
        <View style={styles.statsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
            <StatCard label="Users" value={stats.total_users} iconName="group" />
            <StatCard label="Admins" value={stats.admin_users} iconName="security" />
            <StatCard label="Houses" value={stats.total_houses} iconName="home" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <StatCard label="Devices" value={stats.total_devices} iconName="device-hub" />
            <StatCard label="Sensors" value={stats.total_sensors} iconName="sensors" />
            <StatCard label="Activity" value={stats.today_activity} iconName="trending-up" />
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
function StatCard({ label, value, iconName }) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={iconName} size={32} color={theme.colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  adminName: {
    fontSize: 14,
    color: theme.colors.gray1,
    marginTop: 4,
  },
  headerLogoutButton: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerLogoutText: {
    color: theme.colors.card,
    fontWeight: '600',
  },
  statsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: theme.colors.card,
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
    backgroundColor: theme.colors.card,
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
