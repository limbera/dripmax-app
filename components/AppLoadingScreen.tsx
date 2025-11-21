import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import { authLogger } from '../utils/logger';

// DEV MODE: Set this to true to keep the loading screen visible for review
// IMPORTANT: Set back to false before final deployment
export const DEV_MODE_ALWAYS_SHOW_LOADING = false;

// Fun fashion-related loading messages
const LOADING_MESSAGES = [
  "Tailoring your experience...",
  "Steaming out the wrinkles...",
  "Lacing up and looking sharp...",
  "Checking the fashion forecast...",
  "Adding some accessories...",
  "Walking the virtual runway...",
  "Measuring your style quotient...",
  "Coordinating colors just for you...",
  "Applying the final touches...",
  "Aligning the hemline...",
];

// Generate a unique ID for this loading session
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Stylish app loading screen with fashion-themed messages and animations
 */
export default function AppLoadingScreen() {
  const { 
    currentState, 
    error
  } = useAppStateStore();
  
  // Create unique session ID for tracking this loading screen instance
  const sessionId = useRef(generateSessionId()).current;
  
  // Animation values
  const opacityValue = React.useRef(new Animated.Value(0)).current;
  const rotateValue = React.useRef(new Animated.Value(0)).current;
  
  // State for random messages
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  
  // Log that the loading screen rendered
  React.useEffect(() => {
    authLogger.debug(`Loading screen rendered [${sessionId}]`, { 
      currentState, 
      timestamp: new Date().toISOString() 
    });
    
    // Start animations
    startAnimations();
    
    // Set random loading message
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    
    // Change loading message every 3 seconds
    const messageInterval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 3000);
    
    return () => {
      authLogger.debug(`Loading screen unmounted [${sessionId}]`, {
        currentState,
        timestamp: new Date().toISOString()
      });
      clearInterval(messageInterval);
    };
  }, [currentState, sessionId]);
  
  // Animation functions
  const startAnimations = () => {
    // Fade-in animation
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease)
    }).start();
    
    // Rotate animation (for the accessories icon)
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  };
  
  // Map rotation value to degrees
  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Helper to get emoji based on the loading state
  const getLoadingEmoji = () => {
    if (currentState === AppState.INITIALIZING) return '🌟';
    if (currentState === AppState.LOADING_FONTS) return '✨';
    if (currentState === AppState.CHECKING_AUTH) return '👕';
    if (currentState === AppState.CHECKING_SUBSCRIPTION) return '👗';
    if (currentState === AppState.INITIALIZING_NOTIFICATIONS) return '👑';
    return '👔';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View 
        style={[
          styles.contentContainer,
          { opacity: opacityValue }
        ]}
      >
        {/* App Title at the top */}
        <Text style={styles.topTitle}>dripmax</Text>

        {/* Animated Fashion Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ rotate: spin }] }]}>
          <Text style={styles.emoji}>{getLoadingEmoji()}</Text>
        </Animated.View>
        
        {/* Loading Messages */}
        <Text style={styles.loadingMessage}>{loadingMessage}</Text>
        
        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Add invisible session ID for debugging */}
        <Text style={styles.hiddenSessionId}>{sessionId}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999, // Ensure it appears above everything else
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 30,
    fontFamily: 'SpaceMono',
  },
  titleGreen: {
    color: '#00FF77',
  },
  titleWhite: {
    color: 'white',
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 20,
    padding: 10,
  },
  emoji: {
    fontSize: 48,
    fontFamily: 'SpaceMono',
  },
  loadingMessage: {
    fontSize: 20,
    color: 'white',
    marginBottom: 25,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
  hiddenSessionId: {
    height: 0,
    width: 0,
    opacity: 0,
    position: 'absolute',
  },
  topTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 40,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#00FF77',
    marginBottom: 30,
    marginTop: 20,
  },
}); 