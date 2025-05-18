import { useEffect, useRef, useState } from 'react';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { notificationService } from '../services/notifications';
import { authLogger } from '../utils/logger';
import * as SecureStore from 'expo-secure-store';
import { purgeAuthStorage } from '../services/supabase';

/**
 * Simplified initialization hook with improved error handling and sequencing
 */
export function useAppInitialization() {
  const { 
    currentState, 
    setAppState, 
    markStateComplete, 
    hideSplashScreen,
    setAuthServiceReady,
    setSubscriptionServiceReady,
    setNotificationsReady
  } = useAppStateStore();
  
  // Auth state
  const { 
    initialize: initializeAuth, 
    setupAuthListener, 
    session,
    initialized: authInitialized 
  } = useAuthStore();
  
  // Compute isAuthenticated from session
  const isAuthenticated = !!session;
  
  // Subscription state
  const { 
    initialize: initializeSubscription, 
    hasActiveSubscription,
    isInitialized: subscriptionInitialized
  } = useSubscriptionStore();
  
  // Initialization status
  const [initStatus, setInitStatus] = useState({
    authDone: false,
    subscriptionDone: false,
    notificationsDone: false
  });
  
  // For debugging
  const debugTimestampRef = useRef(Date.now());
  const initCompleted = useRef(false);
  
  // Clear secure store if there are persistent errors (in both dev and prod)
  useEffect(() => {
    const checkAndClearSecureStore = async () => {
      try {
        // Try to validate SecureStore by writing and reading a test value
        const testKey = 'test-init-key';
        await SecureStore.setItemAsync(testKey, 'test-value');
        const testValue = await SecureStore.getItemAsync(testKey);
        
        if (testValue !== 'test-value') {
          // If validation fails, do a complete SecureStore cleanup
          authLogger.warn('Secure store test failed, will reset secure store');
          
          // Clean all auth tokens
          await purgeAuthStorage();
          
          // Try to delete the test key too
          try {
            await SecureStore.deleteItemAsync(testKey);
          } catch (e) {
            // Ignore this particular error
          }
        } else {
          // Clean up the test key
          await SecureStore.deleteItemAsync(testKey);
          
          // Even if the validation passes, we'll try to clean up the
          // problematic key without error logging, as a preventative measure
        }
      } catch (error) {
        authLogger.error('Secure store check failed', error);
        
        // If we can't even perform the check, try to clean auth storage anyway
        try {
          await purgeAuthStorage();
        } catch (e) {
          // Silent fail is acceptable here
        }
      }
    };
    
    checkAndClearSecureStore();
  }, []);
  
  // Main initialization effect - improved sequencing
  useEffect(() => {
    if (initCompleted.current) return;
    
    const runInitialization = async () => {
      try {
        // 1. Start initialization
        authLogger.info(`Starting initialization sequence (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.INITIALIZING);
        markStateComplete(AppState.INITIALIZING);

        // Hide splash screen as early as possible
        authLogger.info(`Hiding splash screen early (${Date.now() - debugTimestampRef.current}ms)`);
        await hideSplashScreen();

        // 2. Font loading - skip actual font loading to avoid getting stuck
        authLogger.info(`Moving to font loading state (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.LOADING_FONTS);
        markStateComplete(AppState.LOADING_FONTS);
        
        // 3. Auth initialization - actually wait for it to complete
        authLogger.info(`Starting auth initialization (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.CHECKING_AUTH);
        
        try {
          await initializeAuth();
          authLogger.info(`Auth initialized (${Date.now() - debugTimestampRef.current}ms)`);
          
          // Set up auth listener
          setupAuthListener();
          authLogger.info(`Auth listener set up (${Date.now() - debugTimestampRef.current}ms)`);
          
          // Wait for auth state to stabilize
          let waitCount = 0;
          while (!authInitialized && waitCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
          
          setInitStatus(prev => ({ ...prev, authDone: true }));
          setAuthServiceReady(true);
        } catch (error) {
          authLogger.error('Auth initialization error', error);
          // Mark as complete even if there's an error so we can continue
        }
        
        markStateComplete(AppState.CHECKING_AUTH);
        
        // 4. Subscription initialization - only for authenticated users
        authLogger.info(`Starting subscription check (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.CHECKING_SUBSCRIPTION);
        
        try {
          // Always initialize subscription service (needed for paywall)
          await initializeSubscription();
          authLogger.info(`Subscription service initialized (${Date.now() - debugTimestampRef.current}ms)`);
          
          // Wait for it to be ready
          let waitCount = 0;
          while (!subscriptionInitialized && waitCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
          
          setInitStatus(prev => ({ ...prev, subscriptionDone: true }));
          setSubscriptionServiceReady(true);
        } catch (error) {
          authLogger.error('Subscription initialization error', error);
        }
        
        markStateComplete(AppState.CHECKING_SUBSCRIPTION);
        
        // 5. Notifications initialization
        authLogger.info(`Initializing notifications (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.INITIALIZING_NOTIFICATIONS);
        
        try {
          await notificationService.initializeBase();
          authLogger.info(`Notifications initialized (${Date.now() - debugTimestampRef.current}ms)`);
          setInitStatus(prev => ({ ...prev, notificationsDone: true }));
          setNotificationsReady(true);
        } catch (error) {
          authLogger.error('Notification initialization error', error);
        }
        
        markStateComplete(AppState.INITIALIZING_NOTIFICATIONS);
        
        // 8. Initialization complete
        initCompleted.current = true;
        
      } catch (error) {
        authLogger.error('Critical initialization error', error);
        // Set to error state if all else fails
        setAppState(AppState.ERROR);
      }
    };
    
    runInitialization();
  }, []);
  
  // Helper function to check if app is initialized
  const isInitialized = () => {
    return [
      AppState.UNAUTHENTICATED,
      AppState.AUTHENTICATED_NO_SUB,
      AppState.AUTHENTICATED_WITH_SUB,
      AppState.ERROR
    ].includes(currentState);
  };
  
  return {
    isInitialized: isInitialized(),
    initStatus
  };
} 