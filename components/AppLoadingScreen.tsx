import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import { authLogger } from '../utils/logger';

/**
 * Simplified loading screen with minimal dependencies
 */
export default function AppLoadingScreen() {
  const { 
    currentState, 
    loadingProgress, 
    error
  } = useAppStateStore();
  
  // Log that the loading screen rendered
  React.useEffect(() => {
    authLogger.debug('Loading screen rendered', { currentState, loadingProgress });
    
    return () => {
      authLogger.debug('Loading screen unmounted');
    };
  }, [currentState, loadingProgress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Text style={styles.title}>DRIPMAX</Text>
      
      <ActivityIndicator size="large" color="#00FF77" style={styles.spinner} />
      
      <Text style={styles.stateLabel}>
        {currentState}
      </Text>
      
      <Text style={styles.progressText}>
        {loadingProgress}%
      </Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  stateLabel: {
    fontSize: 18,
    color: '#00FF77',
    marginBottom: 10,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    width: '80%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
}); 