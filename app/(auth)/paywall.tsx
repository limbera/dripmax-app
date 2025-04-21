import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { authLogger } from '../../utils/logger';
import PaywallGuard from '../../components/PaywallGuard';

export default function PaywallScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { 
    currentOffering, 
    isLoading: isSubscriptionLoading, 
    hasActiveSubscription, 
    ensureSubscriptionStatusChecked,
    refreshOfferings
  } = useSubscription();
  const { user, updateSubscriptionStatus } = useAuth();
  const { pendingImageUri } = usePendingImageStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const hasLoadedOfferings = useRef(false);

  // Make sure offerings are loaded only once
  useEffect(() => {
    if (hasLoadedOfferings.current) return;
    
    const loadOfferings = async () => {
      try {
        hasLoadedOfferings.current = true;
        await refreshOfferings();
        authLogger.info('[Paywall] Offerings refreshed');
      } catch (error) {
        authLogger.error('[Paywall] Error refreshing offerings', error);
      }
    };
    
    loadOfferings();
  }, [refreshOfferings]);

  // Debug console logs to help track the issue - but only log once
  useEffect(() => {
    authLogger.debug('[Paywall] Current subscription status:', { 
      hasActiveSubscription, 
      isLoading: isSubscriptionLoading,
      redirect,
      userId: user?.id,
      hasPendingImage: !!pendingImageUri,
      hasOffering: !!currentOffering
    });
  }, []);

  // Navigate after successful subscription
  const handleSubscriptionSuccess = useCallback(async () => {
    authLogger.info('[Paywall] Subscription successful, navigating');
    
    try {
      // Update subscription status
      const hasSubscription = await ensureSubscriptionStatusChecked();
      authLogger.info(`[Paywall] Subscription check after purchase: ${hasSubscription ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Update the auth store
      updateSubscriptionStatus(hasSubscription);
      
      // Navigate to protected area
      if (pendingImageUri) {
        // If there's a pending image, go to camera to process it
        authLogger.info('[Paywall] Pending image found, navigating to camera for processing', {
          pendingImageUri: pendingImageUri.substring(0, 30) + '...'
        });
        router.replace('/(protected)/camera');
      } else {
        // Otherwise go to main protected area
        authLogger.info('[Paywall] No pending image, navigating to main protected area');
        router.replace('/(protected)');
      }
    } catch (error) {
      authLogger.error('[Paywall] Error after subscription', error);
      // Navigate anyway - make sure we check for pending image even on error
      if (pendingImageUri) {
        router.replace('/(protected)/camera');
      } else {
        router.replace('/(protected)');
      }
    }
  }, [router, ensureSubscriptionStatusChecked, pendingImageUri, updateSubscriptionStatus]);

  // Handle successful purchase
  const handlePurchaseCompleted = useCallback((data: { customerInfo: any }) => {
    authLogger.info('[Paywall] Purchase completed, refreshing subscription status and navigating');
    handleSubscriptionSuccess();
  }, [handleSubscriptionSuccess]);

  // Handle successful restore
  const handleRestoreCompleted = useCallback((data: { customerInfo: any }) => {
    authLogger.info('[Paywall] Restore completed, checking subscription status');
    handleSubscriptionSuccess();
  }, [handleSubscriptionSuccess]);

  // Handle paywall dismiss (either by close button or successful purchase)
  const handlePaywallDismiss = () => {
    authLogger.info('[Paywall] Paywall dismissed, checking subscription status');
    
    // If user has subscription after dismiss, go to protected area
    // Otherwise, go back to previous screen (user pressed close)
    if (hasActiveSubscription) {
      router.replace('/(protected)');
    } else {
      // Usually we'd go back, but in our flow we want to keep them here until they subscribe
      // So we don't navigate away
    }
  };

  // Render the RevenueCat UI Paywall
  const renderPaywall = () => {
    if (isSubscriptionLoading || !currentOffering) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FF77" />
          <Text style={styles.loadingText}>
            Loading subscription options...
          </Text>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.container}>
        <RevenueCatUI.Paywall
          options={currentOffering ? { offering: currentOffering } : undefined}
          onPurchaseCompleted={handlePurchaseCompleted}
          onRestoreCompleted={handleRestoreCompleted}
          onDismiss={handlePaywallDismiss}
        />
      </View>
    );
  };

  return (
    <PaywallGuard>
      {renderPaywall()}
    </PaywallGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    fontFamily: 'SpaceMono',
  },
}); 