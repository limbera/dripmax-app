import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initSentry } from '../services/sentry';
import AppNavigator from '../components/AppNavigator';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { authLogger } from '../utils/logger';
import MixpanelProvider from '../components/MixpanelProvider';

// Prevent the splash screen from auto-hiding before our app state management takes over
try {
  SplashScreen.preventAutoHideAsync().catch(error => {
    authLogger.warn('Error preventing splash screen auto-hide', error);
  });
} catch (error) {
  authLogger.warn('Error in SplashScreen.preventAutoHideAsync()', error);
}

// Initialize Sentry as early as possible
initSentry();

/**
 * Fallback screen in case of critical errors
 */
function FallbackErrorScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
      <Text style={{ color: 'white', fontSize: 18, marginBottom: 20 }}>Something went wrong</Text>
      <Text style={{ color: 'gray', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
        The app encountered an unexpected error. Please restart the app.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasError, setHasError] = useState(false);
  
  // Use the new app initialization hook to manage the startup sequence
  const { isInitialized } = useAppInitialization();
  
  // Log component lifecycle for debugging
  useEffect(() => {
    authLogger.debug('Root layout mounted', { colorScheme, isInitialized });
    
    // Emergency timeout to hide splash screen if something goes wrong
    const timeoutId = setTimeout(() => {
      try {
        SplashScreen.hideAsync().catch(err => {
          authLogger.error('Emergency splash screen hide error', err);
        });
      } catch (error) {
        authLogger.error('Emergency timeout error', error);
      }
    }, 15000); // 15 seconds
    
    return () => {
      clearTimeout(timeoutId);
      authLogger.debug('Root layout unmounted');
    };
  }, [colorScheme, isInitialized]);

  // Handle uncaught errors
  useEffect(() => {
    const errorHandler = (error: any) => {
      authLogger.error('Uncaught error in root layout', error);
      setHasError(true);
      
      // Emergency hide of splash screen
      try {
        SplashScreen.hideAsync().catch(() => {});
      } catch (e) {
        // Ignore errors here
      }
    };
    
    // Add global error handler
    try {
      // Type assertion for React Native's ErrorUtils
      const ErrorUtils = (global as any).ErrorUtils;
      if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
        const originalHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler(errorHandler);
        
        return () => {
          // Restore original handler on cleanup
          ErrorUtils.setGlobalHandler(originalHandler);
        };
      }
    } catch (e) {
      authLogger.warn('Could not set global error handler', e);
    }
  }, []);

  // If we have a critical error, show fallback screen
  if (hasError) {
    return <FallbackErrorScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <MixpanelProvider>
          {/* Use Slot for page rendering and AppNavigator for initialization and navigation */}
          <Slot />
          <AppNavigator />
          <StatusBar style="auto" />
        </MixpanelProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
