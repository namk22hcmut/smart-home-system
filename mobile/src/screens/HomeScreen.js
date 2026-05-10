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
    try {
      console.log('🚪 Logging out...');

      await signOut();

      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      console.log('✅ User signed in - loading data...');
      loadHouses();
      loadUser();
      loadUnreadCount();
      // ⚠️ Skip setupSocketIO for now - token/user_id not accessible from context
      // setupSocketIO will be added in a future update
      
      // Set header with logout button and notification button when signed in
      navigation.setOptions({
        headerShown: true,
        title: 'Smart Home',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          color: '#111827',
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
      // Show header with Login/Sign Up buttons when not signed in
      navigation.setOptions({
        headerShown: true,
        title: 'Smart Home',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          color: '#111827',
        },
        headerStyle: {
          backgroundColor: '#f8f9fa',
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
      console.log('Waiting for token to be ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Fetching houses from API...');
      const data = await apiService.getHouses();
      console.log('Houses loaded successfully:', data.length, 'houses');
      setHouses(data);
    } catch (error) {
      console.error('Error loading houses:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const renderHouseCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('UserFloors', {
          houseId: item.id,
          houseName: item.name
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.houseInfo}>
          <Text style={styles.cardTitle}>
            {item.name}
          </Text>

          <Text style={styles.cardSubtitle}>
            {item.address}
          </Text>
        </View>

        <View style={styles.houseBadge}>
          <Text style={styles.houseBadgeText}>
            {item.floors} floors
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Welcome screen when not signed in
  if (!isSignedIn) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeSubtitle}>Control Your Home Anywhere</Text>
          </View>

          <View style={styles.features}>
            <Feature
              title="Smart Control"
              desc="Control all your devices from one place"
            />

            <Feature
              title="Notifications"
              desc="Real-time updates from your smart home"
            />

            <Feature
              title="Energy Tracking"
              desc="Monitor and optimize energy usage"
            />
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
        <Text style={styles.header}>My Houses</Text>
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity 
            style={[styles.manageBtn, !houses.length && styles.disabledBtn]}
            onPress={() => {
              if (houses.length > 0) {
                navigation.navigate('Dashboard', {
                  houseId: houses[0].id,
                  houseName: houses[0].name,
                });
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
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
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

function Feature({ title, desc }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureDot} />

      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>
          {title}
        </Text>

        <Text style={styles.featureDesc}>
          {desc}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },

  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },

  welcomeHeader: {
    marginTop: 40,
  },

  welcomeSubtitle: {
    fontSize: 28,
    color: '#111827',
    fontWeight: '700',
    lineHeight: 38,
  },

  features: {
    marginVertical: 20,
  },

  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    marginRight: 14,
    marginTop: 6,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  featureDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },

  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 10,
  },

  headerButtons: {
    flexDirection: 'row',
    marginRight: 16,
    alignItems: 'center',
  },

  headerLoginBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },

  headerLoginText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  headerSignupBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  headerSignupText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: '#f4f5f7',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  logoutText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },

  notifButton: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'relative',
  },

  notifButtonText: {
    fontSize: 16,
    color: '#111827',
  },

  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  userInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  welcomeText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },

  header: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },

  headerButtonsRow: {
    flexDirection: 'row',
  },

  manageBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },

  disabledBtn: {
    backgroundColor: '#d1d5db',
  },

  manageBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginVertical: 8,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  houseInfo: {
    flex: 1,
    paddingRight: 12,
  },

  houseBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  houseBadgeText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },

  cardDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
