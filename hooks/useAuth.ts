import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authLogger } from '../utils/logger';
import { AppState, useAppStateStore } from '../stores/appStateStore';

export const useAuth = () => {
  const { 
    user, 
    session, 
    isLoading, 
    error, 
    initialized,
    initialize, 
    signInWithGoogle, 
    signInWithApple, 
    signOut 
  } = useAuthStore();
  
  const { setAppState } = useAppStateStore();
  const [subscriptionStatus, setSubscriptionStatus] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  
  // Initialize auth if not already initialized
  useEffect(() => {
    const initAuth = async () => {
      if (!initialized && !isCheckingAuth) {
        setIsCheckingAuth(true);
        authLogger.info('Auth not initialized, calling initialize');
        
        try {
          await initialize();
          authLogger.info('Auth initialization completed successfully');
        } catch (error) {
          authLogger.error('Auth initialization failed', error);
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };
    
    initAuth();
  }, [initialized, initialize, isCheckingAuth]);

  // Enhanced logging for auth state changes
  useEffect(() => {
    const isAuthenticated = !!session;
    
    authLogger.debug('Auth state updated in useAuth hook', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      initialized,
      isAuthenticated
    });
    
    // Update subscription status when auth state changes
    if (initialized && !isLoading) {
      if (isAuthenticated) {
        // Note: We don't directly check subscription status here to avoid circular deps
        // This will be handled by useSubscription or AppNavigator
        authLogger.info('User authenticated - ready for subscription check');
      } else {
        // If not authenticated, we know there's no subscription
        setSubscriptionStatus(false);
        authLogger.info('User not authenticated - setting UNAUTHENTICATED app state');
        setAppState(AppState.UNAUTHENTICATED);
      }
    }
  }, [user, session, isLoading, initialized, setAppState]);
  
  // Update app state based on authenticated status and subscription status
  useEffect(() => {
    if (!initialized || isLoading || !(session || subscriptionStatus !== null)) return;
    
    const isAuthenticated = !!session;
    
    if (isAuthenticated) {
      if (subscriptionStatus === true) {
        authLogger.info('User has subscription - updating app state');
        setAppState(AppState.AUTHENTICATED_WITH_SUB);
      } else if (subscriptionStatus === false) {
        authLogger.info('User has no subscription - updating app state');
        setAppState(AppState.AUTHENTICATED_NO_SUB);
      }
    } else {
      authLogger.info('User not authenticated - updating app state');
      setAppState(AppState.UNAUTHENTICATED);
    }
  }, [session, subscriptionStatus, initialized, isLoading, setAppState]);
  
  // Method to update subscription status from outside (e.g. from useSubscription)
  const updateSubscriptionStatus = useCallback((hasSubscription: boolean) => {
    setSubscriptionStatus(hasSubscription);
  }, []);

  return {
    user,
    session,
    isLoading: isLoading || isCheckingAuth,
    error,
    initialized,
    isAuthenticated: !!session,
    signInWithGoogle,
    signInWithApple,
    signOut,
    updateSubscriptionStatus
  };
}; 