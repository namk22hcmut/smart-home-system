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
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import theme from '../styles/theme';

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Houses',
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.card,
      headerTitleStyle: {
        fontWeight: '700',
        color: theme.colors.card,
      },
    });
  }, [navigation]);

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
      onPress={() => navigation.navigate('UserFloors', { houseId: item.id, houseName: item.name })}
    >
      <View style={styles.houseHeader}>
        <Text style={styles.houseName}>{item.name}</Text>
        <View style={styles.houseActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openEditModal(item)}
            accessibilityLabel="Edit house"
          >
            <MaterialIcons name="edit" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButtonDanger}
            onPress={() => deleteHouse(item.id)}
            accessibilityLabel="Delete house"
          >
            <MaterialIcons name="delete-outline" size={18} color={theme.colors.card} />
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
      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>My Houses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.86}>
          <MaterialIcons name="add" size={20} color={theme.colors.card} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={houses}
        renderItem={renderHouseItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No houses yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add House" to create one</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHouses(false)} />}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHouse ? 'Edit House' : 'New House'}
              </Text>
              <TouchableOpacity onPress={resetForm} accessibilityLabel="Close modal">
                <MaterialIcons name="close" size={22} color={theme.colors.gray1} />
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
    flex: 1,
    minWidth: 0,
    marginRight: 12,
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
  houseCard: {
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
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    color: theme.colors.primary,
  },
  houseActions: {
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
  iconButtonDanger: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseAddress: {
    fontSize: 14,
    color: theme.colors.gray1,
    marginBottom: 4,
  },
  houseCity: {
    fontSize: 12,
    color: theme.colors.gray2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray1,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 28,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.gray2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray2,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    backgroundColor: theme.colors.background,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: theme.colors.background,
  },
  cancelBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
