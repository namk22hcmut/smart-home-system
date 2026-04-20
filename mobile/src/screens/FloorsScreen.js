/**
 * UserFloorsScreen.js - User Floor Management
 * Allow users to create, edit, delete floors in their house
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

export default function UserFloorsScreen({ navigation, route }) {
  const { houseId, houseName } = route.params;
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [formData, setFormData] = useState({
    floor_name: '',
    floor_number: '',
    description: '',
  });

  // Load floors
  const loadFloors = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);
    try {
      const response = await apiService.get(`/houses/${houseId}/floors`);
      console.log('📍 Floors response:', response);
      if (response && response.success) {
        setFloors(response.data || []);
        console.log('✅ Loaded', (response.data || []).length, 'floors');
      } else {
        console.warn('❌ Floors not successful:', response);
      }
    } catch (error) {
      console.error('❌ Error loading floors:', error);
      Alert.alert('Error', 'Failed to load floors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create new floor
  const createFloor = async () => {
    console.log('📄 Creating floor with data:', { houseId, ...formData });
    
    // Strict validation
    if (!formData.floor_name || !formData.floor_name.trim()) {
      Alert.alert('Error', '❌ Please enter a floor name');
      return;
    }

    try {
      const response = await apiService.post('/floors', {
        house_id: houseId,
        floor_name: formData.floor_name.trim(),
        floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
        description: formData.description,
      });

      console.log('✅ Floor created:', response);
      if (response && response.success) {
        Alert.alert('Success', 'Floor created successfully!');
        resetForm();
        loadFloors(false);
      }
    } catch (error) {
      console.error('❌ Create floor error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create floor');
    }
  };

  // Update floor
  const updateFloor = async () => {
    if (!formData.floor_name.trim()) {
      Alert.alert('Error', 'Please enter floor name');
      return;
    }

    try {
      const response = await apiService.put(`/floors/${editingFloor.id}`, {
        floor_name: formData.floor_name,
        floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
        description: formData.description,
      });

      if (response && response.success) {
        Alert.alert('Success', 'Floor updated successfully!');
        resetForm();
        loadFloors(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update floor');
    }
  };

  // Delete floor
  const deleteFloor = (floorId) => {
    Alert.alert(
      'Delete Floor?',
      'This will delete the floor and all its rooms',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/floors/${floorId}`);
              if (response && response.success) {
                Alert.alert('Success', 'Floor deleted!');
                loadFloors(false);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Open add floor modal
  const openAddModal = () => {
    setEditingFloor(null);
    setFormData({ floor_name: '', floor_number: '', description: '' });
    setModalVisible(true);
  };

  // Open edit floor modal
  const openEditModal = (floor) => {
    setEditingFloor(floor);
    setFormData({
      floor_name: floor.name,
      floor_number: floor.floor_number ? floor.floor_number.toString() : '',
      description: floor.description || '',
    });
    setModalVisible(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ floor_name: '', floor_number: '', description: '' });
    setEditingFloor(null);
    setModalVisible(false);
  };

  // Initial load
  useEffect(() => {
    loadFloors();
  }, []);

  // Render floor item
  const renderFloorItem = ({ item }) => (
    <TouchableOpacity
      style={styles.floorCard}
      onPress={() => navigation.navigate('UserRooms', { floorId: item.id, floorName: item.name })}
    >
      <View style={styles.floorHeader}>
        <View style={styles.floorInfo}>
          <Text style={styles.floorName}>📍 {item.name}</Text>
          {item.floor_number !== null && (
            <Text style={styles.floorNumber}>Level {item.floor_number}</Text>
          )}
        </View>
        <View style={styles.floorActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editBtnText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteFloor(item.id)}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
      {item.description && (
        <Text style={styles.floorDescription}>{item.description}</Text>
      )}
      <Text style={styles.roomsCount}>🚪 {item.rooms} rooms</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading floors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🏠 {houseName}</Text>
      </View>

      {/* Add Floor Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add Floor</Text>
      </TouchableOpacity>

      {/* Floors List */}
      <FlatList
        data={floors}
        renderItem={renderFloorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No floors yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add Floor" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFloors(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFloor ? '✏️ Edit Floor' : '📍 New Floor'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Floor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Ground Floor, 1st Floor"
                value={formData.floor_name}
                onChangeText={(text) => setFormData({ ...formData, floor_name: text })}
              />

              <Text style={styles.label}>Floor Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0, 1, 2"
                value={formData.floor_number}
                onChangeText={(text) => setFormData({ ...formData, floor_number: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Optional description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline={true}
                numberOfLines={4}
              />

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={editingFloor ? updateFloor : createFloor}
                >
                  <Text style={styles.saveBtnText}>
                    {editingFloor ? 'Update' : 'Create'}
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
  header: {
    backgroundColor: '#e74c3c',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  floorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    elevation: 2,
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  floorInfo: {
    flex: 1,
  },
  floorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  floorNumber: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  floorActions: {
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
  floorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roomsCount: {
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
  descriptionInput: {
    textAlignVertical: 'top',
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
