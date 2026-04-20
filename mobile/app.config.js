/**
 * Expo App Configuration
 * Dynamically loads environment variables from .env.local
 */
import 'dotenv/config';

export default {
  expo: {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'mobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    
    // Dynamic environment variables
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api',
    },
    
    ios: {
      supportsTablet: true,
    },
    android: {
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'single',
    },
    plugins: [],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
