import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { navigationLogger } from '../utils/logger';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, setupAuthListener } = useAuthStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();
  const isMounted = useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  // Load fonts
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Always call useProtectedRoute, but pass isReady to control its behavior
  useProtectedRoute();

  // Set mounted status after first render
  useEffect(() => {
    isMounted.current = true;
    navigationLogger.info('Root layout mounted');
    return () => {
      isMounted.current = false;
      navigationLogger.info('Root layout unmounted');
    };
  }, []);
  
  // Initialize auth state listener and subscription
  useEffect(() => {
    if (!isMounted.current) return;
    
    navigationLogger.info('Root layout initializing auth and subscription');
    
    // Initialize the auth store
    initialize();
    
    // Initialize RevenueCat
    initializeSubscription();
    
    // Set up the auth state listener
    navigationLogger.info('Setting up auth listener');
    const unsubscribe = setupAuthListener();
    
    // Clean up the listener when the component unmounts
    return () => {
      navigationLogger.debug('Cleaning up auth listener');
      unsubscribe();
    };
  }, [initialize, setupAuthListener, initializeSubscription]);

  // Mark the layout as ready after initialization and fonts are loaded
  useEffect(() => {
    if (isMounted.current && loaded) {
      navigationLogger.info('Root layout ready for protected route navigation');
      setIsReady(true);
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Use Slot for the initial render to prevent navigation errors */}
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
