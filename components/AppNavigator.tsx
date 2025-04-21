import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import AppLoadingScreen from './AppLoadingScreen';
import { authLogger } from '../utils/logger';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

/**
 * AppNavigator manages navigation based on application state
 * It shows loading screen during initialization and routes to the 
 * appropriate destination once initialization is complete
 */
export default function AppNavigator() {
  const { 
    currentState, 
    isInitialized,
    getTargetRoute,
    setAppState,
    forceRefreshCounter
  } = useAppStateStore();
  
  const { session } = useAuthStore();
  const isAuthenticated = !!session;
  
  const { updateSubscriptionStatus } = useAuth();
  const { 
    hasActiveSubscription, 
    ensureSubscriptionStatusChecked,
    isCheckingSubscription,
    isInitialized: subscriptionInitialized 
  } = useSubscription();
  
  const router = useRouter();
  const mountTimeRef = useRef(Date.now());
  const lastNavigationRef = useRef<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Coordinate authentication and subscription status
  useEffect(() => {
    if (!isInitialized() || isCheckingStatus || isCheckingSubscription) return;
    
    const checkStatusAndUpdateAppState = async () => {
      setIsCheckingStatus(true);
      
      try {
        if (isAuthenticated && subscriptionInitialized) {
          // Force a fresh subscription check
          authLogger.info('Checking subscription status in AppNavigator');
          const hasSubscription = await ensureSubscriptionStatusChecked();
          
          // Update the subscription status in Auth hook
          updateSubscriptionStatus(hasSubscription);
          
          // Update app state based on subscription
          if (hasSubscription) {
            if (currentState !== AppState.AUTHENTICATED_WITH_SUB) {
              authLogger.info('Setting app state to AUTHENTICATED_WITH_SUB');
              setAppState(AppState.AUTHENTICATED_WITH_SUB);
            }
          } else {
            if (currentState !== AppState.AUTHENTICATED_NO_SUB) {
              authLogger.info('Setting app state to AUTHENTICATED_NO_SUB');
              setAppState(AppState.AUTHENTICATED_NO_SUB);
            }
          }
        } else if (!isAuthenticated) {
          // Not authenticated
          if (currentState !== AppState.UNAUTHENTICATED) {
            authLogger.info('Setting app state to UNAUTHENTICATED');
            setAppState(AppState.UNAUTHENTICATED);
          }
        }
      } catch (error) {
        authLogger.error('Error checking status in AppNavigator', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    checkStatusAndUpdateAppState();
  }, [
    isAuthenticated, 
    hasActiveSubscription, 
    currentState, 
    setAppState, 
    isInitialized,
    ensureSubscriptionStatusChecked,
    updateSubscriptionStatus,
    subscriptionInitialized,
    isCheckingSubscription
  ]);
  
  // Safety timeout - if initialization takes too long, force a navigation
  useEffect(() => {
    const SAFETY_TIMEOUT = 10000; // 10 seconds
    
    const timeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - mountTimeRef.current;
      
      if (!isInitialized()) {
        authLogger.warn(`Safety timeout triggered after ${elapsedTime}ms - forcing app to UNAUTHENTICATED state`);
        
        // Force app to unauthenticated state if it's taking too long
        setAppState(AppState.UNAUTHENTICATED);
        
        // Force navigation
        try {
          router.replace('/(auth)/login');
        } catch (error) {
          authLogger.error('Forced navigation error', { error });
        }
      }
    }, SAFETY_TIMEOUT);
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized, router, setAppState]);
  
  // Log when AppNavigator is mounted
  useEffect(() => {
    authLogger.debug('AppNavigator mounted', { 
      currentState, 
      isInitialized: isInitialized(),
      isAuthenticated,
      mountTime: mountTimeRef.current
    });
    
    return () => {
      authLogger.debug('AppNavigator unmounted');
    };
  }, [currentState, isInitialized, isAuthenticated]);
  
  // Handle navigation based on app state or forced refresh
  useEffect(() => {
    // Only navigate when initialization is complete and not checking status
    if (isInitialized() && !isCheckingStatus && !isCheckingSubscription) {
      const targetRoute = getTargetRoute();
      
      // Avoid duplicate navigations to the same route
      if (lastNavigationRef.current === targetRoute) {
        authLogger.debug(`Skipping duplicate navigation to ${targetRoute}`);
        return;
      }
      
      // Update last navigation reference
      lastNavigationRef.current = targetRoute;
      
      authLogger.info(`Navigation to ${targetRoute} triggered by app state: ${currentState}`);
      
      // Navigate to the target route
      try {
        router.replace(targetRoute);
        authLogger.debug('Router.replace called successfully');
      } catch (error) {
        authLogger.error('Navigation error', { error: error instanceof Error ? error.message : String(error) });
      }
    } else {
      authLogger.debug('Waiting before navigation', {
        currentState,
        isInitialized: isInitialized(),
        isCheckingStatus,
        isCheckingSubscription,
        elapsedTime: Date.now() - mountTimeRef.current
      });
    }
  }, [
    currentState, 
    isInitialized, 
    getTargetRoute, 
    router, 
    forceRefreshCounter, 
    isCheckingStatus,
    isCheckingSubscription
  ]);
  
  // If not initialized, show loading screen
  if (!isInitialized()) {
    return <AppLoadingScreen />;
  }
  
  // Return null since the router will handle the navigation
  return null;
} 