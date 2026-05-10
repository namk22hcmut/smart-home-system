/**
 * UserHousesScreen.js - User House Management
 * Allow users to create, edit, delete their own houses
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
  ScrollView,
} from 'react-native';
import { apiService } from '../services/api';

export default function UserHousesScreen({ navigation }) {
  const isMounted = useRef(true);
  
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [formData, setFormData] = useState({
    house_name: '',
    address: '',
    city: '',
    country: '',
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load user's houses
  const loadHouses = async (showLoader = true) => {
    if (showLoader && isMounted.current) setLoading(true);
    if (isMounted.current) setRefreshing(true);
    try {
      const response = await apiService.get('/houses');
      if (isMounted.current) {
        if (response && response.success) {
          setHouses(response.data || []);
          console.log('✅ Loaded', (response.data || []).length, 'houses');
        }
      }
    } catch (error) {
      console.error('❌ Error loading houses:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load houses');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Create new house
  const createHouse = async () => {
    console.log('🏠 Creating house with data:', formData);
    if (!formData.house_name.trim()) {
      Alert.alert('Error', 'Please enter house name');
      return;
    }

    try {
      const response = await apiService.post('/houses', {
        name: formData.house_name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
      });

      console.log('✅ House created:', response);
      if (response && response.success) {
        Alert.alert('Success', 'House created successfully!');
        resetForm();
        loadHouses(false);
      }
    } catch (error) {
      console.error('❌ Create error:', error);
      Alert.alert('Error', error.message || 'Failed to create house');
    }
  };

  // Update house
  const updateHouse = async () => {
    console.log('✏️ Updating house', editingHouse.id, 'with data:', formData);
    if (!formData.house_name.trim()) {
      Alert.alert('Error', 'Please enter house name');
      return;
    }

    try {
      const response = await apiService.put(`/houses/${editingHouse.id}`, {
        name: formData.house_name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
      });

      console.log('✅ Update response:', response);
      if (response && response.success) {
        Alert.alert('Success', 'House updated successfully!');
        resetForm();
        loadHouses(false);
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update house');
    }
  };

  // Delete house
  const deleteHouse = async (houseId) => {
    console.log('🗑️ Delete button clicked for house:', houseId);
    
    Alert.alert(
      'Delete House',
      'Delete this house and all its data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('❌ Delete cancelled');
          },
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              console.log('📤 Sending DELETE request to /api/houses/' + houseId);
              const response = await apiService.delete(`/houses/${houseId}`);
              console.log('✅ Delete response:', response);
              
              if (response && response.success) {
                console.log('✅ House deleted successfully!');
                Alert.alert('Success', 'House deleted!');
                await loadHouses(false);
              } else {
                Alert.alert('Error', response?.error || 'Failed to delete');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              const errorMsg = error.response?.data?.error || error.message || 'Failed to delete house';
              console.error('Error details:', errorMsg);
              Alert.alert('Error', errorMsg);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Open add house modal
  const openAddModal = () => {
    console.log('📝 Opening Add House Modal');
    setEditingHouse(null);
    setFormData({ house_name: '', address: '', city: '', country: '' });
    setModalVisible(true);
  };

  // Open edit house modal
  const openEditModal = (house) => {
    setEditingHouse(house);
    setFormData({
      house_name: house.name,
      address: house.address || '',
      city: house.city || '',
      country: house.country || '',
    });
    setModalVisible(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ house_name: '', address: '', city: '', country: '' });
    setEditingHouse(null);
    setModalVisible(false);
  };

  // Initial load
  useEffect(() => {
    loadHouses();
  }, []);

  // Render house item
  const renderHouseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.houseCard}
      onPress={() =>
        navigation.navigate('UserFloors', {
          houseId: item.id,
          houseName: item.name,
        })
      }
    >
      <View style={styles.houseHeader}>
        <Text style={styles.houseName}>
          {item.name}
        </Text>

        <View style={styles.houseActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editBtnText}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteHouse(item.id)}
          >
            <Text style={styles.deleteBtnText}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.houseAddress}>
        {item.address || 'No address'}
      </Text>

      {item.city && (
        <Text style={styles.houseCity}>
          {item.city}, {item.country}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading houses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add House Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add House</Text>
      </TouchableOpacity>

      {/* Houses List */}
      <FlatList
        data={houses}
        renderItem={renderHouseItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No houses yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add House" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHouses(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHouse ? 'Edit House' : 'New House'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>House Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter house name"
                value={formData.house_name}
                onChangeText={(text) => setFormData({ ...formData, house_name: text })}
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter city"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />

              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter country"
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
              />

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={editingHouse ? updateHouse : createHouse}
                >
                  <Text style={styles.saveBtnText}>
                    {editingHouse ? 'Update' : 'Create'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },

  addBtn: {
    backgroundColor: '#111827',

    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,

    paddingVertical: 14,

    borderRadius: 16,

    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  houseCard: {
    backgroundColor: '#fff',

    borderRadius: 22,

    padding: 18,

    marginBottom: 16,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  houseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  houseName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    color: '#111827',
    marginRight: 12,
  },

  houseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editBtn: {
    backgroundColor: '#f3f4f6',

    minWidth: 64,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 10,

    marginRight: 8,

    justifyContent: 'center',
    alignItems: 'center',
  },

  editBtnText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },

  deleteBtn: {
    backgroundColor: '#fee2e2',

    minWidth: 72,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 10,

    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },

  houseAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 20,
  },

  houseCity: {
    fontSize: 13,
    color: '#9ca3af',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  closeBtn: {
    fontSize: 24,
    color: '#9ca3af',
  },

  formContainer: {
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },

  buttonGroup: {
    flexDirection: 'row',
    marginTop: 28,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveBtn: {
    backgroundColor: '#111827',
    marginRight: 8,
  },

  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  cancelBtn: {
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },

  cancelBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
});