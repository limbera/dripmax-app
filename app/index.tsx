import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAppStateStore, AppState } from '../stores/appStateStore';
import AppLoadingScreen from '../components/AppLoadingScreen';
import { authLogger } from '../utils/logger';

/**
 * Root index component - this is what's shown initially
 * It will render a loading screen during initialization
 * Navigation to actual screens is handled by AppNavigator
 */
export default function Index() {
  const { currentState, isInitialized } = useAppStateStore();
  
  // Log that this screen rendered
  useEffect(() => {
    authLogger.debug('Index page rendered', { 
      currentState, 
      isInitialized: isInitialized() 
    });
  }, [currentState, isInitialized]);
  
  // Show loading screen during initialization
  if (!isInitialized()) {
    // Use a very simple loading indicator as a fallback
    // This is just in case AppLoadingScreen has any issues
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'black' 
      }}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={{ 
          marginTop: 20, 
          color: 'white', 
          fontSize: 16 
        }}>
          Starting Dripmax...
        </Text>
        <Text style={{ 
          marginTop: 10, 
          color: 'gray', 
          fontSize: 12 
        }}>
          Current state: {currentState}
        </Text>
      </View>
    );
  }
  
  // Return an empty View; the actual navigation will be handled by AppNavigator
  return <View style={{ flex: 1, backgroundColor: 'black' }} />;
} 