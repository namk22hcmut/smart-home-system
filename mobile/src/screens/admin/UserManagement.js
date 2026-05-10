/**
 * UserManagement.js - Admin User Management Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { apiService } from '../../services/api';

export default function UserManagement({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Load users
  const loadUsers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get('/admin/users');
      if (response.success) {
        setUsers(response.data);
        console.log('✅ Loaded', response.data.length, 'users');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadUsers();
  }, []);

  // Simple confirm for web
  const confirmAction = (title, onConfirm) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(title)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'destructive' },
      ]);
    }
  };

  // Disable user
  const disableUser = async (userId, username) => {
    confirmAction(`Disable ${username}?`, async () => {
      try {
        console.log(`🔴 Disabling user ${userId}...`);
        const response = await apiService.put(`/admin/users/${userId}/disable`, {
          reason: 'Disabled by admin',
        });
        console.log('Disable response:', response);
        if (response.success) {
          Alert.alert('Success', `${username} has been disabled`);
          loadUsers(false);
        } else {
          Alert.alert('Error', response.error || 'Failed to disable user');
        }
      } catch (error) {
        console.error('❌ Disable error:', error);
        Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to disable user');
      }
    });
  };

  // Enable user
  const enableUser = async (userId, username) => {
    confirmAction(`Enable ${username}?`, async () => {
      try {
        console.log(`🟢 Enabling user ${userId}...`);
        const response = await apiService.put(`/admin/users/${userId}/enable`);
        console.log('Enable response:', response);
        if (response.success) {
          Alert.alert('Success', `${username} has been enabled`);
          loadUsers(false);
        } else {
          Alert.alert('Error', response.error || 'Failed to enable user');
        }
      } catch (error) {
        console.error('❌ Enable error:', error);
        Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to enable user');
      }
    });
  };

  // Change user role
  const changeUserRole = async (userId, username, currentRole) => {
    const newRole = currentRole === 'user' ? 'admin' : 'user';
    confirmAction(`Change ${username} to ${newRole}?`, async () => {
      try {
        console.log(`🔑 Changing user ${userId} role to ${newRole}...`);
        const response = await apiService.put(`/admin/users/${userId}/role`, {
          new_role: newRole,
        });
        console.log('Role change response:', response);
        if (response.success) {
          Alert.alert('Success', `${username} is now a ${newRole}`);
          loadUsers(false);
        } else {
          Alert.alert('Error', response.error || 'Failed to change role');
        }
      } catch (error) {
        console.error('❌ Role change error:', error);
        Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to change role');
      }
    });
  };

  // Delete user
  const deleteUser = async (userId, username) => {
    confirmAction(`Delete ${username}? (Cannot be undone)`, async () => {
      try {
        console.log(`🗑️ Deleting user ${userId}...`);
        const response = await apiService.delete(`/admin/users/${userId}/delete`);
        console.log('Delete response:', response);
        if (response.success) {
          Alert.alert('Success', `${username} has been deleted`);
          loadUsers(false);
        } else {
          Alert.alert('Error', response.error || 'Failed to delete user');
        }
      } catch (error) {
        console.error('❌ Delete error:', error);
        Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to delete user');
      }
    });
  };

  // Render user item
  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.userCard,
        item.status === 'inactive' && { opacity: 0.6 },
        item.role === 'admin' && { borderLeftColor: '#e74c3c' },
      ]}
      onPress={() => setSelectedUser(item)}
    >
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={[styles.roleText, item.role === 'admin' && { color: '#e74c3c' }]}>
            {item.role.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.status, { color: item.status === 'active' ? '#2ecc71' : '#e74c3c' }]}>
          {item.status.toUpperCase()}
        </Text>
        <Text style={styles.fullName}>{item.full_name}</Text>
      </View>

      {item.last_login && (
        <Text style={styles.lastLogin}>Last login: {new Date(item.last_login).toLocaleDateString()}</Text>
      )}

      <View style={styles.actionButtons}>
        {item.status === 'active' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#111827' }]}
            onPress={() => disableUser(item.user_id, item.username)}
          >
            <Text style={styles.actionBtnText}>Disable</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#111827' }]}
            onPress={() => enableUser(item.user_id, item.username)}
          >
            <Text style={styles.actionBtnText}>Enable</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#374151' }]}
          onPress={() => changeUserRole(item.user_id, item.username, item.role)}
        >
          <Text style={styles.actionBtnText}>
            {item.role === 'user' ? 'Make Admin' : 'Make User'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
          onPress={() => deleteUser(item.user_id, item.username)}
        >
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.user_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(false)} />}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
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

  userCard: {
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

  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',

    marginBottom: 10,
  },

  username: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  email: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  roleBadge: {
    backgroundColor: '#f3f4f6',

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,
  },

  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'uppercase',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 10,
  },

  status: {
    fontSize: 12,
    fontWeight: '600',
  },

  fullName: {
    fontSize: 13,
    color: '#4b5563',
  },

  lastLogin: {
    fontSize: 12,
    color: '#9ca3af',

    marginBottom: 14,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  actionBtn: {
    flex: 1,

    paddingVertical: 10,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});