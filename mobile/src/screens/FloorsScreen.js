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
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { theme } from '../styles/theme';

export default function UserFloorsScreen({ navigation, route }) {
  const { houseId, houseName } = route.params;
  const isMounted = useRef(true);
  
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: houseName || 'Floors',
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.card,
      headerTitleStyle: {
        fontWeight: '700',
        color: theme.colors.card,
      },
    });
  }, [navigation, houseName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load floors
  const loadFloors = async (showLoader = true) => {
    if (showLoader && isMounted.current) setLoading(true);
    if (isMounted.current) setRefreshing(true);
    try {
      const response = await apiService.get(`/houses/${houseId}/floors`);
      console.log('📍 Floors response:', response);
      if (isMounted.current) {
        if (response && response.success) {
          setFloors(response.data || []);
          console.log('✅ Loaded', (response.data || []).length, 'floors');
        } else {
          console.warn('❌ Floors not successful:', response);
        }
      }
    } catch (error) {
      console.error('❌ Error loading floors:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load floors');
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
      activeOpacity={0.86}
      onPress={() => navigation.navigate('UserRooms', { floorId: item.id, floorName: item.name })}
    >
      <View style={styles.floorHeader}>
        <View style={styles.floorInfo}>
          <Text style={styles.floorName} numberOfLines={1}>{item.name}</Text>
          {item.floor_number !== null && item.floor_number !== undefined && (
            <Text style={styles.floorNumber}>Level {item.floor_number}</Text>
          )}
        </View>

        <View style={styles.floorActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(event) => {
              event.stopPropagation();
              openEditModal(item);
            }}
            accessibilityLabel="Edit floor"
          >
            <MaterialIcons name="edit" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(event) => {
              event.stopPropagation();
              deleteFloor(item.id);
            }}
            accessibilityLabel="Delete floor"
          >
            <MaterialIcons name="delete-outline" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.floorDescription}>{item.description}</Text>
      ) : null}

      <View style={styles.floorFooter}>
        <View style={styles.metaPill}>
          <Text style={styles.roomsCount}>{item.rooms || 0} rooms</Text>
        </View>
        <View style={styles.openHint}>
          <Text style={styles.openHintText}>Open</Text>
          <MaterialIcons name="chevron-right" size={20} color={theme.colors.gray2} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading floors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Floors</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.86}>
          <MaterialIcons name="add" size={20} color={theme.colors.card} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Floors List */}
      <FlatList
        data={floors}
        renderItem={renderFloorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="layers-clear" size={34} color={theme.colors.gray2} />
            </View>
            <Text style={styles.emptyText}>No floors yet</Text>
            <Text style={styles.emptySubtext}>Add the first floor for this house</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFloors(false)} />}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFloor ? 'Edit floor' : 'New floor'}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetForm} accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Floor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Ground Floor, 1st Floor"
                placeholderTextColor={theme.colors.gray2}
                value={formData.floor_name}
                onChangeText={(text) => setFormData({ ...formData, floor_name: text })}
              />

              <Text style={styles.label}>Floor Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0, 1, 2"
                placeholderTextColor={theme.colors.gray2}
                value={formData.floor_number}
                onChangeText={(text) => setFormData({ ...formData, floor_number: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Optional description"
                placeholderTextColor={theme.colors.gray2}
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
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  floorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorInfo: {
    flex: 1,
    minWidth: 0,
  },
  floorName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  floorNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray2,
    marginTop: 4,
  },
  floorActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.gray1,
    marginTop: 14,
  },
  floorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  roomsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.gray1,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.gray2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray2,
    marginTop: 8,
    textAlign: 'center',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    maxHeight: '82%',
  },
  modalScrollContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  descriptionInput: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.card,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },
});
