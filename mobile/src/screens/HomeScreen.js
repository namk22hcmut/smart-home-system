/**
 * Home Screen - Show List of Houses or Welcome (based on authentication)
 */
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { apiService } from '../services/api';
import authService from '../services/auth';
import { AuthContext } from '../context/AuthContext';
import NotificationSocket from '../services/notification_socket';
import { theme } from '../styles/theme';

export default function HomeScreen({ navigation }) {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isSignedIn, signOut } = useContext(AuthContext);

  // Load unread notification count
  const loadUnreadCount = async () => {
    try {
      // ⚠️ Add small delay to ensure token is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔔 Fetching unread notifications...');
      const response = await apiService.get('/notifications?unread_only=true');
      console.log('✅ Unread count response:', response);
      if (response && response.success) {
        const count = response.unread_count || 0;
        setUnreadCount(count);
        console.log('✅ Unread count set to:', count);
      } else {
        console.warn('⚠️ Notification response not successful:', response);
        setUnreadCount(0);
      }
    } catch (error) {
      // Silently fail - notifications are optional
      console.warn('⚠️ Could not load unread count (notifications endpoint may not be available):', error.message);
      setUnreadCount(0); // Default to 0 unread
    }
  };

  // ⚠️ setupSocketIO temporarily disabled - will add in future update with proper token/user handling

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Logout cancelled'),
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            console.log('🚪 User confirmed logout - calling signOut()');
            try {
              const result = await signOut();
              console.log('✅ signOut() completed with result:', result);
              // AuthContext will automatically update isSignedIn to false
              // App.js will redirect to login screen
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout: ' + (error.message || 'Unknown error'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  useEffect(() => {
    if (isSignedIn) {
      console.log('✅ User signed in - loading data...');
      loadHouses();
      loadUser();
      loadUnreadCount();
      navigation.setOptions({
        headerShown: true,
        title: 'Smart Home',
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.card,
        headerTitleStyle: {
          fontWeight: '700',
          color: theme.colors.card,
        },
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.notifButton}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <Text style={styles.notifButtonText}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ),
      });

      // Cleanup on unmount
      return () => {
        NotificationSocket.disconnect();
      };
    } else {
      navigation.setOptions({
        headerShown: true,
        title: 'Smart Home',
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          color: theme.colors.primary,
        },
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerLoginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.headerLoginText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerSignupBtn}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.headerSignupText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [isSignedIn, navigation]);

  const loadUser = async () => {
    try {
      const userData = await authService.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadHouses = async () => {
    try {
      setLoading(true);
      // ⚠️ Add small delay to ensure token is ready from AsyncStorage
      console.log('⏳ Waiting for token to be ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('📍 Fetching houses from API...');
      const data = await apiService.getHouses();
      console.log('✅ Houses loaded successfully:', data.length, 'houses');
      setHouses(data);
    } catch (error) {
      console.error('❌ Error loading houses:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const renderHouseCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('UserFloors', { 
        houseId: item.id, 
        houseName: item.name 
      })}
    >
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardSubtitle}>{item.address}</Text>
      <Text style={styles.cardDetail}>{item.floors} Floors</Text>
    </TouchableOpacity>
  );

  // Welcome screen when not signed in
  if (!isSignedIn) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeTitle}>Smart Home</Text>
            <Text style={styles.welcomeSubtitle}>Control Your Home Anywhere</Text>
          </View>

          <View style={styles.features}>
            <Feature icon="" title="Smart Control" desc="Control all your devices from one place" />
            <Feature icon="" title="Get Notified" desc="Real-time notifications for your home" />
            <Feature icon="" title="Save Energy" desc="Track and optimize your energy usage" />
          </View>

          <Text style={styles.footer}>Smart Home © 2026</Text>
        </View>
      </View>
    );
  }

  // Houses screen when signed in
  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome, {user.full_name || user.username}!</Text>
        </View>
      )}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>My Houses</Text>
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity 
            style={[styles.manageBtn, !houses.length && styles.disabledBtn]}
            onPress={() => {
              if (houses.length > 0) {
                navigation.navigate('Dashboard', { house: houses[0] });
              } else {
                Alert.alert('No Houses', 'You need at least one house to view the dashboard');
              }
            }}
            disabled={!houses.length}
          >
            <Text style={styles.manageBtnText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.manageBtn}
            onPress={() => navigation.navigate('Houses')}
          >
            <Text style={styles.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={houses}
          renderItem={renderHouseCard}
          keyExtractor={(item) => item.id.toString()}
          refreshing={loading}
          onRefresh={loadHouses}
        />
      )}
    </View>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  welcomeHeader: {
    marginTop: 20,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: theme.colors.gray1,
    fontWeight: '500',
    marginBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusPill: {
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillActive: {
    backgroundColor: theme.colors.primary,
  },
  statusPillGuest: {
    backgroundColor: theme.colors.gray2,
  },
  statusPillText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '700',
  },
  features: {
    marginVertical: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: theme.colors.gray1,
    lineHeight: 20,
  },
  footer: {
    textAlign: 'center',
    color: theme.colors.gray2,
    fontSize: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
    alignItems: 'center',
  },
  headerLoginBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerLoginText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  headerSignupBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerSignupText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '600',
  },
  notifButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'relative',
  },
  notifButtonText: {
    fontSize: 16,
    color: theme.colors.card,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.card,
    fontSize: 10,
    fontWeight: 'bold',
  },
  userInfo: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  welcomeText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
  },
  manageBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledBtn: {
    backgroundColor: theme.colors.gray2,
    opacity: 0.6,
  },
  manageBtnText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: '600',
  },
  authActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  authPrimaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  authPrimaryText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: '700',
  },
  authSecondaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  authSecondaryText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.gray1,
    marginBottom: 8,
  },
  cardDetail: {
    fontSize: 12,
    color: theme.colors.gray2,
  },
});
