import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import AppLoadingScreen, { DEV_MODE_ALWAYS_SHOW_LOADING } from './AppLoadingScreen';
import { authLogger } from '../utils/logger';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useSubscription } from '../hooks/useSubscription';

// Navigation debounce timeout in ms
const NAVIGATION_DEBOUNCE_MS = 300;

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
    forceRefreshCounter,
    authServiceReady,
    setError
  } = useAppStateStore();
  
  const { 
    session, 
    isLoading: isAuthLoading,
    initialized: authInitialized
  } = useAuthStore();
  
  const { hasActiveSubscription } = useSubscriptionStore();
  
  const { ensureSubscriptionStatusChecked } = useSubscription();
  
  const router = useRouter();
  const mountTimeRef = useRef(Date.now());
  const lastNavigationRef = useRef<string | null>(null);
  const lastNavigationTimeRef = useRef<number>(0);
  const navigationInProgressRef = useRef<boolean>(false);
  const [isCheckingSubForNav, setIsCheckingSubForNav] = useState(false);
  const finalStateDeterminationComplete = useRef(false);
  
  // Helper function to check if navigation is allowed
  const canNavigate = (route: string): boolean => {
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationTimeRef.current;
    
    // Don't navigate if:
    // 1. We're already navigating
    // 2. We recently navigated (debounce)
    // 3. We're trying to navigate to the same route
    if (navigationInProgressRef.current) {
      authLogger.debug(`Skipping navigation - already navigating`);
      return false;
    }
    
    if (timeSinceLastNav < NAVIGATION_DEBOUNCE_MS) {
      authLogger.debug(`Debouncing navigation - last navigation was ${timeSinceLastNav}ms ago`);
      return false;
    }
    
    if (lastNavigationRef.current === route) {
      authLogger.debug(`Skipping duplicate navigation to ${route}`);
      return false;
    }
    
    return true;
  };
  
  // Determine and set the final app state once auth settles
  useEffect(() => {
    if (finalStateDeterminationComplete.current) {
      authLogger.debug('AppNavigator: Final state already determined, skipping.');
      return;
    }

    const authStoreSettled = authServiceReady && authInitialized && !isAuthLoading;

    authLogger.debug('AppNavigator: Final state check (auth only)', {
      authServiceReady,
      authInitialized,
      isAuthLoading,
      hasActiveSubscription
    });

    if (!authStoreSettled) {
      authLogger.debug('Waiting for auth store to settle before final state selection');
      return;
    }

    const currentSession = useAuthStore.getState().session;

    const applyFinalState = (hasSub: boolean) => {
      const finalState = hasSub ? AppState.AUTHENTICATED_WITH_SUB : AppState.AUTHENTICATED_NO_SUB;
      authLogger.info(`Final state determined: ${finalState}`);
      if (currentState !== finalState) {
        setAppState(finalState);
      }
    };

    if (!currentSession) {
      authLogger.info('Final state determined: UNAUTHENTICATED');
      setAppState(AppState.UNAUTHENTICATED);
      finalStateDeterminationComplete.current = true;
      return;
    }

    // Use current subscription flag for immediate routing
    applyFinalState(!!hasActiveSubscription);
    finalStateDeterminationComplete.current = true;

    // Refresh subscription status in the background
    if (!isCheckingSubForNav) {
      setIsCheckingSubForNav(true);
      ensureSubscriptionStatusChecked()
        .then(result => {
          authLogger.info(`Background subscription refresh complete: ${result}`);
          applyFinalState(result);
        })
        .catch(error => {
          authLogger.error('Error refreshing subscription status in background', error);
          setError('Failed to refresh subscription status.');
        })
        .finally(() => {
          setIsCheckingSubForNav(false);
        });
    }
  }, [
    authServiceReady,
    authInitialized,
    isAuthLoading,
    hasActiveSubscription,
    isCheckingSubForNav,
    ensureSubscriptionStatusChecked,
    setAppState,
    setError
  ]);
  
  // Safety timeout - if initialization takes too long, force a navigation
  useEffect(() => {
    const SAFETY_TIMEOUT = 30000; // Increase to 30 seconds
    
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
      isAuthLoading,
      mountTime: mountTimeRef.current
    });
    
    return () => {
      authLogger.debug('AppNavigator unmounted');
    };
  }, [currentState, isInitialized, isAuthLoading]);
  
  // Handle navigation based on app state or forced refresh
  useEffect(() => {
    // Only navigate when initialization is complete and not checking status
    if (isInitialized()) {
      const targetRoute = getTargetRoute();
      
      // Check if navigation is allowed
      if (!canNavigate(targetRoute)) {
        return;
      }
      
      // Update navigation state
      navigationInProgressRef.current = true;
      lastNavigationTimeRef.current = Date.now();
      lastNavigationRef.current = targetRoute;
      
      authLogger.info(`Navigation to ${targetRoute} triggered by app state: ${currentState}`);
      
      // Navigate to the target route
      try {
        router.replace(targetRoute);
        authLogger.debug('Router.replace called successfully');
        
        // Reset navigation state after a short delay
        setTimeout(() => {
          navigationInProgressRef.current = false;
        }, NAVIGATION_DEBOUNCE_MS);
      } catch (error) {
        authLogger.error('Navigation error', { error: error instanceof Error ? error.message : String(error) });
        navigationInProgressRef.current = false;
      }
    } else {
      authLogger.debug('Waiting before navigation', {
        currentState,
        isInitialized: isInitialized(),
        elapsedTime: Date.now() - mountTimeRef.current
      });
    }
  }, [
    currentState, 
    isInitialized, 
    getTargetRoute, 
    router, 
    forceRefreshCounter
  ]);
  
  // In dev mode, show the loading screen as an overlay on top of the actual app content
  // In normal mode, show loading screen only during initialization
  if (DEV_MODE_ALWAYS_SHOW_LOADING) {
    // Still initiate navigation if not initialized
    if (!isInitialized()) {
      return <AppLoadingScreen />;
    }
    
    // When initialized, show both the regular app and the loading screen overlay
    return <AppLoadingScreen />;
  }
  
  // Standard behavior - show loading screen only during initialization
  if (!isInitialized()) {
    return <AppLoadingScreen />;
  }
  
  // Return null since the router will handle the navigation
  return null;
} 