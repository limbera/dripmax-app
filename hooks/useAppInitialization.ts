import { useEffect, useRef, useState } from 'react';
import { AppState, useAppStateStore } from '../stores/appStateStore';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { notificationService } from '../services/notifications';
import { authLogger } from '../utils/logger';
import * as SecureStore from 'expo-secure-store';

/**
 * Simplified initialization hook with improved error handling and sequencing
 */
export function useAppInitialization() {
  const { 
    currentState, 
    setAppState, 
    markStateComplete, 
    hideSplashScreen
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
  
  // Clear secure store if there are persistent errors (development only)
  useEffect(() => {
    if (__DEV__) {
      const checkAndClearSecureStore = async () => {
        try {
          // Check if we can read from secure store
          const testKey = 'test-init-key';
          await SecureStore.setItemAsync(testKey, 'test-value');
          const testValue = await SecureStore.getItemAsync(testKey);
          
          if (testValue !== 'test-value') {
            authLogger.warn('Secure store test failed, will reset secure store');
            // List of keys potentially used for auth
            const keysToCheck = [
              'sb-iqvvgtmskgdbvvisgkxw-auth-token',
              'EXPO_SECURE_STORE_AUTH_TOKEN',
              'auth-session'
            ];
            
            // Try to delete any problematic keys
            for (const key of keysToCheck) {
              try {
                await SecureStore.deleteItemAsync(key);
                authLogger.info(`Deleted key from secure store: ${key}`);
              } catch (e) {
                // Ignore errors on deletion
              }
            }
          } else {
            await SecureStore.deleteItemAsync(testKey);
          }
        } catch (error) {
          authLogger.error('Secure store check failed', error);
        }
      };
      
      checkAndClearSecureStore();
    }
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
        } catch (error) {
          authLogger.error('Subscription initialization error', error);
        }
        
        markStateComplete(AppState.CHECKING_SUBSCRIPTION);
        
        // 5. Notifications initialization
        authLogger.info(`Initializing notifications (${Date.now() - debugTimestampRef.current}ms)`);
        setAppState(AppState.INITIALIZING_NOTIFICATIONS);
        
        try {
          await notificationService.initialize();
          authLogger.info(`Notifications initialized (${Date.now() - debugTimestampRef.current}ms)`);
          setInitStatus(prev => ({ ...prev, notificationsDone: true }));
        } catch (error) {
          authLogger.error('Notification initialization error', error);
        }
        
        markStateComplete(AppState.INITIALIZING_NOTIFICATIONS);
        
        // 6. Set final app state based on authenticated state
        authLogger.info(`Setting final app state (${Date.now() - debugTimestampRef.current}ms)`);
        setFinalAppState();
        
        // 7. Hide splash screen
        authLogger.info(`Hiding splash screen (${Date.now() - debugTimestampRef.current}ms)`);
        await hideSplashScreen();
        
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
  
  // Separate function to determine final app state
  const setFinalAppState = () => {
    if (!isAuthenticated) {
      authLogger.info('User not authenticated - setting UNAUTHENTICATED state');
      setAppState(AppState.UNAUTHENTICATED);
    } else if (hasActiveSubscription) {
      authLogger.info('User authenticated with subscription - setting AUTHENTICATED_WITH_SUB state');
      setAppState(AppState.AUTHENTICATED_WITH_SUB);
    } else {
      authLogger.info('User authenticated without subscription - setting AUTHENTICATED_NO_SUB state');
      setAppState(AppState.AUTHENTICATED_NO_SUB);
    }
  };
  
  // Update app state when auth/subscription changes
  useEffect(() => {
    // Skip during initial initialization
    if (!initCompleted.current) return;
    
    // Update app state based on current auth and subscription status
    setFinalAppState();
  }, [isAuthenticated, hasActiveSubscription]);
  
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