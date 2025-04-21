import { useEffect, useCallback, useState, useRef } from 'react';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useAuthStore } from '../stores/authStore';
import { authLogger } from '../utils/logger';

export const useSubscription = () => {
  const authStore = useAuthStore();
  const { user, session } = authStore;
  const isAuthenticated = !!session;
  
  const { 
    isInitialized,
    isLoading,
    customerInfo,
    currentOffering,
    hasActiveSubscription,
    error,
    identifyUser,
    fetchOfferings,
    purchasePackage,
    restorePurchases,
    checkEntitlementStatus,
    resetUser,
    ensureSubscriptionStatusChecked
  } = useSubscriptionStore();
  
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const hasIdentifiedUser = useRef(false);
  const currentUserId = useRef<string | null>(null);
  
  // Link RevenueCat identity with auth user when authenticated - fixed to prevent infinite loop
  useEffect(() => {
    const subscriptionLogger = {
      debug: (message: string, data?: any) => authLogger.debug(`[useSubscription] ${message}`, data),
      info: (message: string, data?: any) => authLogger.info(`[useSubscription] ${message}`, data),
      error: (message: string, data?: any) => authLogger.error(`[useSubscription] ${message}`, data),
    };

    // Only run if something actually changed
    if (!isInitialized || isCheckingSubscription) return;
    
    // Skip if we already identified this user
    if (user?.id && user.id === currentUserId.current && hasIdentifiedUser.current) {
      subscriptionLogger.debug('Skipping duplicate identity check for same user', { userId: user.id });
      return;
    }

    // Try to identify the user with RevenueCat when authenticated
    const identifyRevenueCatUser = async () => {
      try {
        if (isAuthenticated && user) {
          // Update refs immediately to prevent concurrent runs
          currentUserId.current = user.id;
          
          setIsCheckingSubscription(true);
          
          subscriptionLogger.info('Identifying user with RevenueCat', {
            userId: user.id
          });
          
          try {
            await identifyUser(user.id);
            subscriptionLogger.debug('User successfully identified with RevenueCat');
            
            // After identifying, check entitlement status
            await checkEntitlementStatus();
            subscriptionLogger.debug('Entitlement status checked after identification');
            
            // Mark as identified to prevent redundant calls
            hasIdentifiedUser.current = true;
          } catch (err) {
            subscriptionLogger.error('Error in RevenueCat identification flow', { error: err });
          } finally {
            setIsCheckingSubscription(false);
          }
        } else if (!isAuthenticated && hasIdentifiedUser.current) {
          subscriptionLogger.debug('User logged out, resetting RevenueCat user');
          
          // Clear the identification flag
          hasIdentifiedUser.current = false;
          currentUserId.current = null;
          
          try {
            await resetUser();
            subscriptionLogger.debug('RevenueCat user reset successfully');
          } catch (err) {
            subscriptionLogger.error('Error resetting RevenueCat user', { error: err });
          }
        }
      } catch (error) {
        subscriptionLogger.error('Unexpected error in subscription identity flow', { error });
        setIsCheckingSubscription(false);
      }
    };
    
    identifyRevenueCatUser();
  }, [isInitialized, isAuthenticated, user?.id, identifyUser, resetUser, checkEntitlementStatus, isCheckingSubscription]);

  // Refresh offerings when needed
  const refreshOfferings = useCallback(async () => {
    if (isInitialized) {
      try {
        await fetchOfferings();
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }, [isInitialized, fetchOfferings]);
  
  // Force subscription check - useful when we need a guaranteed fresh check
  const forceSubscriptionCheck = useCallback(async () => {
    if (!isInitialized || isCheckingSubscription) {
      return hasActiveSubscription;
    }
    
    setIsCheckingSubscription(true);
    try {
      const hasSubscription = await ensureSubscriptionStatusChecked();
      authLogger.info(`Forced subscription check result: ${hasSubscription ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);
      return hasSubscription;
    } catch (error) {
      authLogger.error('Error during forced subscription check', error);
      return false;
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [isInitialized, ensureSubscriptionStatusChecked, hasActiveSubscription, isCheckingSubscription]);

  return {
    isLoading: isLoading || isCheckingSubscription,
    customerInfo,
    currentOffering,
    hasActiveSubscription,
    error,
    fetchOfferings,
    refreshOfferings,
    purchasePackage,
    restorePurchases,
    checkEntitlementStatus,
    ensureSubscriptionStatusChecked: forceSubscriptionCheck, // Replace with our improved version
    isCheckingSubscription,
    isInitialized
  };
}; 