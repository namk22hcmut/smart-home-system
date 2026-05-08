/**
 * HouseSharing.js - Admin House Sharing Management
 */
import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../../services/api';

export default function HouseSharing({ navigation }) {
  const isMounted = useRef(true);
  
  const [houses, setHouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [houseUsers, setHouseUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccessLevel, setEditingAccessLevel] = useState(null);  // Track which user to edit
  const [changeAccessLevelModalVisible, setChangeAccessLevelModalVisible] = useState(false);  // Modal for changing role
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('viewer');

  // Load houses and users
  const loadData = async (showLoader = true) => {
    if (showLoader && isMounted.current) setLoading(true);
    if (isMounted.current) setRefreshing(true);
    try {
      console.log('🏠 Loading houses and users...');
      const housesResponse = await apiService.get('/houses');
      const usersResponse = await apiService.get('/admin/users');

      console.log('Houses response:', housesResponse);
      console.log('Users response:', usersResponse);

      if (isMounted.current) {
        if (housesResponse.success) {
          setHouses(housesResponse.data);
          console.log('✅ Loaded', housesResponse.data.length, 'houses');
        } else {
          console.error('❌ Houses response failed:', housesResponse);
        }
        if (usersResponse.success) {
          setUsers(usersResponse.data);
          console.log('✅ Loaded', usersResponse.data.length, 'users');
        }
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load data: ' + error.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Load house users
  const loadHouseUsers = async (houseId) => {
    try {
      const response = await apiService.get(`/admin/houses/${houseId}/users`);
      if (isMounted.current && response.success) {
        setHouseUsers(response.data);
        console.log('✅ Loaded', response.data.length, 'users for house');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial load (only once on mount)
  useEffect(() => {
    console.log('🏠 HouseSharing mounted - loading data');
    loadData();
  }, []);

  // When house selected, load its users
  useEffect(() => {
    if (selectedHouse) {
      loadHouseUsers(selectedHouse.id);
    }
  }, [selectedHouse]);

  // Share house with user
  const shareHouse = async () => {
    if (!selectedUser || !selectedHouse) {
      Alert.alert('Error', 'Please select user and house');
      return;
    }

    try {
      const response = await apiService.post(`/admin/houses/${selectedHouse.id}/share`, {
        target_user_id: selectedUser,
        access_level: selectedAccessLevel,
      });

      if (response.success) {
        Alert.alert('Success', 'House shared successfully!');
        await loadHouseUsers(selectedHouse.id);
        closeAddUserModal();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to share house');
    }
  };

  // Change user access level
  const changeAccessLevel = async () => {
    if (!editingAccessLevel || !selectedHouse) {
      Alert.alert('Error', 'Missing data');
      return;
    }

    try {
      const response = await apiService.post(
        `/api/admin/houses/${selectedHouse.id}/users/${editingAccessLevel.user_id}/access-level`,
        { access_level: selectedAccessLevel }
      );

      if (response.success) {
        Alert.alert('Success', 'Access level changed!');
        await loadHouseUsers(selectedHouse.id);
        closeChangeAccessLevelModal();
      } else {
        Alert.alert('Error', response.error || 'Failed to change access level');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change access level');
    }
  };

  // Unshare house
  const unshareHouse = async (userId) => {
    Alert.alert(
      'Unshare House?',
      'Remove access for this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unshare',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.post(
                `/api/admin/houses/${selectedHouse.id}/unshare`,
                { target_user_id: userId }
              );

              if (response.success) {
                Alert.alert('Success', 'Access removed!');
                await loadHouseUsers(selectedHouse.id);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to unshare');
            }
          },
        },
      ]
    );
  };

  // Close modals and reset states
  const closeAddUserModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
    setSelectedAccessLevel('viewer');
  };

  const closeChangeAccessLevelModal = () => {
    setChangeAccessLevelModalVisible(false);
    setEditingAccessLevel(null);
    setSelectedAccessLevel('viewer');
  };

  // Open change access level modal
  const openChangeAccessLevelModal = (user) => {
    setEditingAccessLevel(user);
    setSelectedAccessLevel(user.access_level);
    setChangeAccessLevelModalVisible(true);
  };

  // Render house item
  const renderHouseItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.houseCard, selectedHouse?.id === item.id && styles.houseCardSelected]}
      onPress={() => setSelectedHouse(item)}
    >
      <View style={styles.houseHeader}>
        <Text style={styles.houseName}>🏠 {item.name}</Text>
        <Text style={styles.userCount}>
          {selectedHouse?.id === item.id ? `${houseUsers.length} users` : ''}
        </Text>
      </View>
      <Text style={styles.houseLocation}>{item.address || 'No address'}</Text>
    </TouchableOpacity>
  );

  // Render house user
  const renderHouseUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userAccessLevel}>
        <Text style={[styles.accessLevel, { color: getAccessLevelColor(item.access_level) }]}>
          {getAccessLevelIcon(item.access_level)} {item.access_level.toUpperCase()}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.editRoleBtn}
          onPress={() => openChangeAccessLevelModal(item)}
        >
          <Text style={styles.editRoleBtnText}>✎ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => unshareHouse(item.user_id)}
        >
          <Text style={styles.removeBtnText}>🗑 Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getAccessLevelColor = (level) => {
    const colors = {
      owner: '#e74c3c',
      manager: '#f39c12',
      viewer: '#3498db',
    };
    return colors[level] || '#7f8c8d';
  };

  const getAccessLevelIcon = (level) => {
    const icons = {
      owner: '👑',
      manager: '🔧',
      viewer: '👁️',
    };
    return icons[level] || '📋';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading houses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* House List */}
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Select a House:</Text>
        <FlatList
          data={houses}
          renderItem={renderHouseItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} />}
        />
      </View>

      {/* House Users */}
      {selectedHouse && (
        <View style={styles.usersPanel}>
          <View style={styles.usersPanelHeader}>
            <Text style={styles.usersPanelTitle}>Users in "{selectedHouse.house_name}"</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Add User</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={houseUsers}
            renderItem={renderHouseUser}
            keyExtractor={(item) => item.user_id.toString()}
            style={styles.usersList}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users have access to this house yet</Text>
            }
          />
        </View>
      )}

      {/* Share Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share House with User</Text>
              <TouchableOpacity onPress={closeAddUserModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* User Picker */}
              <Text style={styles.pickerLabel}>Select User:</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={selectedUser}
                  onValueChange={(value) => setSelectedUser(value)}
                  style={styles.pickerInput}
                >
                  <Picker.Item label="-- Choose User --" value={null} />
                  {users
                    .filter((u) => !houseUsers.some((hu) => hu.user_id === u.user_id))
                    .map((user) => (
                      <Picker.Item
                        key={user.user_id}
                        label={`${user.username} (${user.email})`}
                        value={user.user_id}
                      />
                    ))}
                </Picker>
              </View>

              {/* Access Level Picker */}
              <Text style={styles.pickerLabel}>Access Level:</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={selectedAccessLevel}
                  onValueChange={(value) => setSelectedAccessLevel(value)}
                  style={styles.pickerInput}
                >
                  <Picker.Item label="👁️ Viewer (Read Only)" value="viewer" />
                  <Picker.Item label="🔧 Manager (Control)" value="manager" />
                  <Picker.Item label="👑 Owner (Full Access)" value="owner" />
                </Picker>
              </View>

              {/* Info */}
              <Text style={styles.infoText}>
                • Viewer: Can only view devices and data{'\n'}
                • Manager: Can control devices and view history{'\n'}
                • Owner: Full access including permissions
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#95a5a6' }]}
                onPress={closeAddUserModal}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#2ecc71' }]}
                onPress={shareHouse}
              >
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Access Level Modal */}
      <Modal visible={changeAccessLevelModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Access Level</Text>
              <TouchableOpacity onPress={closeChangeAccessLevelModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {editingAccessLevel && (
                <>
                  <View style={styles.userInfoSection}>
                    <Text style={styles.userInfoLabel}>User:</Text>
                    <Text style={styles.userInfoValue}>{editingAccessLevel.username}</Text>
                    <Text style={styles.userInfoEmail}>{editingAccessLevel.email}</Text>
                  </View>

                  <Text style={styles.pickerLabel}>New Access Level:</Text>
                  <View style={styles.picker}>
                    <Picker
                      selectedValue={selectedAccessLevel}
                      onValueChange={(value) => setSelectedAccessLevel(value)}
                      style={styles.pickerInput}
                    >
                      <Picker.Item label="👁️ Viewer (Read Only)" value="viewer" />
                      <Picker.Item label="🔧 Manager (Control)" value="manager" />
                      <Picker.Item label="👑 Owner (Full Access)" value="owner" />
                    </Picker>
                  </View>

                  <Text style={styles.infoText}>
                    • Viewer: Can only view devices and data{'\n'}
                    • Manager: Can control devices and view history{'\n'}
                    • Owner: Full access including permissions
                  </Text>
                </>
              )}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#95a5a6' }]}
                onPress={closeChangeAccessLevelModal}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#3498db' }]}
                onPress={changeAccessLevel}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  houseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
    elevation: 2,
  },
  houseCardSelected: {
    backgroundColor: '#e8f8f5',
    borderLeftColor: '#2ecc71',
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  houseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userCount: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    color: '#7f8c8d',
  },
  houseLocation: {
    fontSize: 12,
    color: '#95a5a6',
  },
  usersPanel: {
    backgroundColor: '#fff',
    height: '40%',
    borderTopWidth: 1,
    borderTopColor: '#bdc3c7',
  },
  usersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  usersPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  userCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userEmail: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 2,
  },
  userAccessLevel: {
    marginHorizontal: 8,
  },
  accessLevel: {
    fontSize: 11,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editRoleBtn: {
    backgroundColor: '#3498db',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  editRoleBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  userInfoSection: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userInfoEmail: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#95a5a6',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 6,
    marginBottom: 16,
  },
  pickerInput: {
    height: 50,
  },
  infoText: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 18,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
