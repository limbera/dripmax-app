import { useEffect, useCallback } from 'react';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useAuth } from './useAuth';
import { authLogger } from '../utils/logger';

export const useSubscription = () => {
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
  
  const { user, isAuthenticated } = useAuth();

  // Link RevenueCat identity with auth user
  useEffect(() => {
    const subscriptionLogger = {
      debug: (message: string, data?: any) => authLogger.debug(`[useSubscription] ${message}`, data),
      info: (message: string, data?: any) => authLogger.info(`[useSubscription] ${message}`, data),
      error: (message: string, data?: any) => authLogger.error(`[useSubscription] ${message}`, data),
    };

    if (isInitialized && isAuthenticated && user) {
      subscriptionLogger.debug('Auth state changed, identifying user with RevenueCat', {
        userId: user.id,
        isAuthenticated
      });
      identifyUser(user.id).catch(err => {
        subscriptionLogger.error('Error identifying user with RevenueCat', { error: err.message });
      });
    } else if (isInitialized && !isAuthenticated) {
      subscriptionLogger.debug('User logged out, resetting RevenueCat user');
      resetUser().catch(err => {
        subscriptionLogger.error('Error resetting RevenueCat user', { error: err.message });
      });
    }
  }, [isInitialized, isAuthenticated, user, identifyUser, resetUser]);

  // Refresh subscription status when the hook is mounted
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      checkEntitlementStatus().catch(err => {
        authLogger.error(`[useSubscription] Error checking entitlement status: ${err.message}`);
      });
    }
  }, [isInitialized, isAuthenticated, checkEntitlementStatus]);

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

  return {
    isLoading,
    customerInfo,
    currentOffering,
    hasActiveSubscription,
    error,
    fetchOfferings,
    refreshOfferings,
    purchasePackage,
    restorePurchases,
    checkEntitlementStatus,
    ensureSubscriptionStatusChecked
  };
}; 