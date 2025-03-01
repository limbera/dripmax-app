import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { navigationLogger } from '../utils/logger';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, setupAuthListener } = useAuthStore();
  
  // Use the protected route hook to handle auth navigation
  useProtectedRoute();
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize auth state listener
  useEffect(() => {
    navigationLogger.info('Root layout effect running');
    
    // Initialize the auth store
    initialize();
    
    // Set up the auth state listener
    navigationLogger.info('Setting up auth listener');
    const unsubscribe = setupAuthListener();
    
    // Clean up the listener when the component unmounts
    return () => {
      navigationLogger.debug('Cleaning up auth listener');
      unsubscribe();
    };
  }, [initialize, setupAuthListener]);

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
