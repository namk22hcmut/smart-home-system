/**
 * UserHousesScreen.js - User House Management
 * Allow users to create, edit, delete their own houses
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
  TextInput,
  ScrollView,
} from 'react-native';
import { apiService } from '../services/api';

export default function UserHousesScreen({ navigation }) {
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

  // Load user's houses
  const loadHouses = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get('/houses');
      if (response && response.success) {
        setHouses(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'houses');
      }
    } catch (error) {
      console.error('❌ Error loading houses:', error);
      Alert.alert('Error', 'Failed to load houses');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    
    const confirmed = window.confirm('Delete this house and all its data?\nThis action cannot be undone');
    if (!confirmed) {
      console.log('❌ Delete cancelled');
      return;
    }

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
      onPress={() => navigation.navigate('UserFloors', { houseId: item.id, houseName: item.name })}
    >
      <View style={styles.houseHeader}>
        <Text style={styles.houseName}>🏠 {item.name}</Text>
        <View style={styles.houseActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editBtnText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteHouse(item.id)}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.houseAddress}>{item.address || 'No address'}</Text>
      {item.city && <Text style={styles.houseCity}>{item.city}, {item.country}</Text>}
    </TouchableOpacity>
  );

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
                {editingHouse ? '✏️ Edit House' : '🏠 New House'}
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  addBtn: {
    backgroundColor: '#27ae60',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  houseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    elevation: 2,
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  houseActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 4,
  },
  editBtnText: {
    color: 'white',
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 4,
  },
  deleteBtnText: {
    color: 'white',
    fontSize: 16,
  },
  houseAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  houseCity: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#27ae60',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#ecf0f1',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
