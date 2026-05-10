/**
 * UserFloorsScreen.js - User Floor Management
 * Allow users to create, edit, delete floors in their house
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

export default function UserFloorsScreen({ navigation, route }) {
  const { houseId, houseName } = route.params;
  const isMounted = useRef(true);
    useEffect(() => {
      return () => {
        isMounted.current = false;
      };
    }, []);
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
    if (showLoader && isMounted.current) {
      setLoading(true);
    }

    if (isMounted.current) {
      setRefreshing(true);
    }

    try {
      const response = await apiService.get(
        `/houses/${houseId}/floors`
      );

      if (
        response &&
        response.success &&
        isMounted.current
      ) {
        setFloors(response.data || []);
      }
    } catch (error) {
      console.error(
        'Error loading floors:',
        error
      );

      if (isMounted.current) {
        Alert.alert(
          'Error',
          'Failed to load floors'
        );
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Create new floor
  const createFloor = async () => {
    console.log('📄 Creating floor with data:', { houseId, ...formData });
    
    // Strict validation
    if (!formData.floor_name || !formData.floor_name.trim()) {
      Alert.alert('Error', 'Please enter a floor name');
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
      const response = await apiService.put(`/floors/${editingFloor.id || editingFloor.floor_id}`, {
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
      floor_name:
        floor.name || floor.floor_name || '',

      floor_number:
        floor.floor_number !== null &&
        floor.floor_number !== undefined
          ? floor.floor_number.toString()
          : '',

      description:
        floor.description || '',
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
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('UserRooms', {
          floorId: item.id,
          floorName: item.name
        })
      }
    >
      <View style={styles.floorHeader}>
        <View style={styles.floorInfo}>
          <Text style={styles.floorName}>
            {item.name}
          </Text>

          {item.floor_number !== null && (
            <Text style={styles.floorNumber}>
              Level {item.floor_number}
            </Text>
          )}
        </View>

        <View style={styles.floorActions}>
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
            onPress={() => deleteFloor(item.id)}
          >
            <Text style={styles.deleteBtnText}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.description && (
        <Text style={styles.floorDescription}>
          {item.description}
        </Text>
      )}

      <View style={styles.floorFooter}>
        <Text style={styles.roomsCount}>
          {item.rooms} rooms
        </Text>

        <Text style={styles.viewText}>
          View rooms
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading floors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {houseName}
          </Text>
        </View>
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
                {editingFloor ? 'Edit Floor' : 'New Floor'}
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
    backgroundColor: '#f4f5f7',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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

  floorCard: {
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

  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  floorInfo: {
    flex: 1,
    paddingRight: 12,
  },

  floorName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  floorNumber: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  floorActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },

  editBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },

  deleteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },

  floorDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 14,
  },

  floorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  roomsCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  viewText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
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
    fontSize: 22,
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

  descriptionInput: {
    textAlignVertical: 'top',
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
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
});
