/**
 * Main App.js - React Native App Entry Point with Role-Based Navigation (Web + Native)
 */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import Auth Context
import { AuthProvider, AuthContext } from './src/context/AuthContext';

// Import Screens - Auth
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

// Import Screens - User App
import HomeScreen from './src/screens/HomeScreen';
import HousesScreen from './src/screens/HousesScreen';
import FloorsScreen from './src/screens/FloorsScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import NotificationCenter from './src/screens/NotificationCenter';
import AutomationRulesScreen from './src/screens/AutomationRulesScreen';

// Import Screens - New Features (1, 2, 6)
import DashboardScreen from './src/screens/DashboardScreen';
import DeviceSchedulingScreen from './src/screens/DeviceSchedulingScreen';
import DeviceActivityLogsScreen from './src/screens/DeviceActivityLogsScreen';

// Import Screens - Admin App
import AdminPanel from './src/screens/AdminPanel';
import UserManagement from './src/screens/admin/UserManagement';
import ActivityLogs from './src/screens/admin/ActivityLogs';
import SystemStats from './src/screens/admin/SystemStats';
import HouseSharing from './src/screens/admin/HouseSharing';

const Stack = createNativeStackNavigator();

// User Navigation Stack
function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Smart Home',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Houses" 
        component={HousesScreen}
        options={{
          title: 'My Houses',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="NotificationCenter" 
        component={NotificationCenter}
        options={{
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="UserFloors" 
        component={FloorsScreen}
        options={({ route }) => ({
          title: route.params?.houseName || 'Floors',
        })}
      />
      <Stack.Screen 
        name="UserRooms" 
        component={RoomsScreen}
        options={({ route }) => ({
          title: route.params?.floorName || 'Rooms',
        })}
      />
      <Stack.Screen 
        name="UserDevices" 
        component={DevicesScreen}
        options={({ route }) => ({
          title: route.params?.roomName || 'Devices',
        })}
      />
      <Stack.Screen 
        name="AutomationRules" 
        component={AutomationRulesScreen}
        options={({ route }) => ({
          title: `${route.params?.roomName || 'Room'} - Automation`,
        })}
      />
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={({ route }) => ({
          title: 'Dashboard',
          headerShown: true,
        })}
      />
      <Stack.Screen 
        name="DeviceScheduling" 
        component={DeviceSchedulingScreen}
        options={({ route }) => ({
          title: 'Device Schedule',
          headerShown: true,
        })}
      />
      <Stack.Screen 
        name="DeviceActivityLogs" 
        component={DeviceActivityLogsScreen}
        options={({ route }) => ({
          title: 'Activity Logs',
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
}

// Admin Navigation Stack - Completely Separate
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AdminPanel" 
        component={AdminPanel}
        options={{
          title: 'Admin Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagement}
        options={{
          title: 'User Management',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="ActivityLogs" 
        component={ActivityLogs}
        options={{
          title: 'Activity Logs',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="SystemStats" 
        component={SystemStats}
        options={{
          title: 'System Statistics',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="HouseSharing" 
        component={HouseSharing}
        options={{
          title: 'House Sharing',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

// Auth Navigation Stack (Login/Signup)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
      />
    </Stack.Navigator>
  );
}

// Main App Stack with auth screens
function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Smart Home',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="NotificationCenter" 
        component={NotificationCenter}
        options={{
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="Floors" 
        component={FloorsScreen}
        options={({ route }) => ({
          title: route.params?.houseName || 'Floors',
        })}
      />
      <Stack.Screen 
        name="Rooms" 
        component={RoomsScreen}
        options={({ route }) => ({
          title: route.params?.floorName || 'Rooms',
        })}
      />
      <Stack.Screen 
        name="Devices" 
        component={DevicesScreen}
        options={({ route }) => ({
          title: route.params?.roomName || 'Devices',
        })}
      />
    </Stack.Navigator>
  );
}

// Main App Content - Routes based on auth state and user role
function AppContent() {
  const { isLoading, isSignedIn, user } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isSignedIn ? (
        <AuthStack />
      ) : user?.role === 'admin' ? (
        <AdminStack />
      ) : (
        <UserStack />
      )}
    </NavigationContainer>
  );
}

// Main App Component with Provider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
