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
    subscriptionServiceReady,
    notificationsReady,
    setError
  } = useAppStateStore();
  
  const { 
    session, 
    isLoading: isAuthLoading,
    initialized: authInitialized
  } = useAuthStore();
  
  const { 
    hasActiveSubscription, 
    isLoading: isSubscriptionLoading,
    isInitialized: subscriptionInitialized
  } = useSubscriptionStore();
  
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
  
  // NEW: Effect to determine and set the final app state once initialization is complete
  useEffect(() => {
    // Create an async function inside the effect to use await
    const determineState = async () => {
      // --- Add Ref Check --- 
      if (finalStateDeterminationComplete.current) {
        authLogger.debug('AppNavigator: Final state already determined, skipping.');
        return;
      }

      authLogger.debug('AppNavigator: Final state check', {
        authServiceReady,
        subscriptionServiceReady,
        notificationsReady,
        authInitialized,
        subscriptionInitialized,
        isAuthLoading,
        isSubscriptionLoading,
        isCheckingSubForNav // Log the local check state
      });

      // Wait until all init services report ready and main auth store is settled
      const allServicesReady = authServiceReady && subscriptionServiceReady && notificationsReady;
      const authStoreSettled = !isAuthLoading && authInitialized;

      if (allServicesReady && authStoreSettled && !isCheckingSubForNav) {
        try {
          const currentSession = useAuthStore.getState().session;
          let finalState: AppState;

          if (!currentSession) {
            // User is not authenticated
            finalState = AppState.UNAUTHENTICATED;
            authLogger.info('Final state determined: UNAUTHENTICATED');
            if (currentState !== finalState) setAppState(finalState);
            finalStateDeterminationComplete.current = true; // <-- Set flag

          } else {
            // User is authenticated, now check subscription explicitly
            authLogger.info('Auth settled, explicitly checking subscription status...');
            setIsCheckingSubForNav(true); // Mark that we are checking sub
            
            const hasSubscription = await ensureSubscriptionStatusChecked(); // REMOVE: (true)
            authLogger.info(`Explicit subscription check complete: ${hasSubscription}`);
            
            if (hasSubscription) {
              finalState = AppState.AUTHENTICATED_WITH_SUB;
            } else {
              finalState = AppState.AUTHENTICATED_NO_SUB;
            }
            authLogger.info(`Final state determined: ${finalState}`);
            if (currentState !== finalState) setAppState(finalState);
            finalStateDeterminationComplete.current = true; // <-- Set flag
          }

        } catch (error) {
          authLogger.error('Error determining final app state', error);
          setError('Failed to determine application state.');
        } finally {
          // Ensure we reset the local checking flag
          if (useAuthStore.getState().session) { // Only reset if we potentially started the check
             setIsCheckingSubForNav(false);
          }
        }
      } else {
        authLogger.debug('Waiting for services/auth store to settle or sub check to finish...');
      }
    };

    determineState();

  }, [
    // Dependencies: Only need initial readiness/auth state. Ref prevents re-run.
    authServiceReady,
    subscriptionServiceReady,
    notificationsReady,
    authInitialized,
    isAuthLoading,
    ensureSubscriptionStatusChecked,
    setAppState,
    setError
    // REMOVED: isCheckingSubForNav (ref handles re-entrancy)
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
      isAuthLoading,
      isSubscriptionLoading,
      mountTime: mountTimeRef.current
    });
    
    return () => {
      authLogger.debug('AppNavigator unmounted');
    };
  }, [currentState, isInitialized, isAuthLoading, isSubscriptionLoading]);
  
  // Handle navigation based on app state or forced refresh
  useEffect(() => {
    // Only navigate when initialization is complete and not checking status
    if (isInitialized() && !isCheckingSubForNav && !isSubscriptionLoading) {
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
        isCheckingSubForNav,
        isSubscriptionLoading,
        elapsedTime: Date.now() - mountTimeRef.current
      });
    }
  }, [
    currentState, 
    isInitialized, 
    getTargetRoute, 
    router, 
    forceRefreshCounter, 
    isCheckingSubForNav,
    isSubscriptionLoading
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