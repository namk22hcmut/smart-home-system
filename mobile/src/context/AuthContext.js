/**
 * Auth Context - Global Authentication State Management
 */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import authService from '../services/auth';

export const AuthContext = createContext();

// Use localStorage for web, AsyncStorage for native
let storage;
if (Platform.OS === 'web') {
  storage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  };
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Check auth state
  const checkAuth = useCallback(async () => {
    try {
      const token = await storage.getItem('authToken');
      const userData = await storage.getItem('user');
      const authenticated = !!token;
      console.log(`🔐 Auth check: ${authenticated ? 'authenticated' : 'not authenticated'}`);
      setIsSignedIn(authenticated);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsSignedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Monitor token changes every 100ms (faster detection)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = await storage.getItem('authToken');
        const userData = await storage.getItem('user');
        const authenticated = !!token;
        setIsSignedIn(prev => {
          if (prev !== authenticated) {
            console.log(`🔄 Auth state changed to: ${authenticated ? 'signed in' : 'signed out'}`);
          }
          return authenticated;
        });
        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth monitor:', error);
      }
    }, 100); // Check every 100ms instead of 300ms

    return () => clearInterval(interval);
  }, []);

  const authContext = {
    isLoading,
    isSignedIn,
    user, // User object with role, email, etc.
    signIn: async (username, password) => {
      const result = await authService.login(username, password);
      if (result.success) {
        console.log('✅ Login success, user role:', result.data.user?.role);
        
        // ⚠️ AsyncStorage on Expo Go is slow - wait longer
        console.log('⏳ Waiting for token to be saved to AsyncStorage...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 500ms to 2000ms
        
        // Verify token was actually saved
        const savedToken = await storage.getItem('authToken');
        console.log('🔐 Token verification:', savedToken ? `✅ Saved (length: ${savedToken.length})` : '❌ NOT saved!');
        
        if (!savedToken) {
          console.error('❌ Token save failed! Retrying...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        setIsSignedIn(true);
        setUser(result.data.user);
        console.log('✅ State updated: isSignedIn=true, user set');
      } else {
        console.error('❌ Login failed:', result.error);
      }
      return result;
    },
    signUp: async (username, email, password, fullName) => {
      const result = await authService.signup(username, email, password, fullName);
      if (result.success) {
        console.log('✅ Signup success, user role:', result.data.user?.role);
        
        // ⚠️ AsyncStorage on Expo Go is slow - wait longer
        console.log('⏳ Waiting for token to be saved to AsyncStorage...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 500ms to 2000ms
        
        // Verify token was actually saved
        const savedToken = await storage.getItem('authToken');
        console.log('🔐 Token verification:', savedToken ? `✅ Saved (length: ${savedToken.length})` : '❌ NOT saved!');
        
        if (!savedToken) {
          console.error('❌ Token save failed! Retrying...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        setIsSignedIn(true);
        setUser(result.data.user);
        console.log('✅ State updated: isSignedIn=true, user set');
      } else {
        console.error('❌ Signup failed:', result.error);
      }
      return result;
    },
    signOut: async () => {
      console.log('🚪 Starting logout...');
      try {
        // 1. Clear storage immediately
        console.log('🗑️ Clearing authToken from storage...');
        await storage.removeItem('authToken');
        await storage.removeItem('user');
        
        // 2. Verify token is gone
        const tokenAfterClear = await storage.getItem('authToken');
        console.log(`🔍 Token after clear: ${tokenAfterClear ? 'STILL EXISTS' : '✅ CLEARED'}`);
        
        // 3. Update state IMMEDIATELY - don't wait
        console.log('📱 Setting isSignedIn=false');
        setIsSignedIn(false);
        setUser(null);
        
        // 4. Wait a bit for React to flush state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('✅ Logout complete - App should show login screen now');
        
        return true;
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Force state update even on error
        setIsSignedIn(false);
        setUser(null);
        return false;
      }
    },
  };

  return (
    <AuthContext.Provider value={{ ...authContext, user }}>
      {children}
    </AuthContext.Provider>
  );
};
