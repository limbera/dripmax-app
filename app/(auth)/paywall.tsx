import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, Animated, Easing } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { authLogger } from '../../utils/logger';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

export default function PaywallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { 
    currentOffering, 
    isLoading: isSubscriptionLoading, 
    ensureSubscriptionStatusChecked,
    refreshOfferings
  } = useSubscription();
  const { user, updateSubscriptionStatus } = useAuth();
  const { pendingImageUri } = usePendingImageStore();
  const hasLoadedOfferings = useRef(false);
  const justPurchasedOrRestored = useRef(false);
  
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Make sure offerings are loaded only once
  useEffect(() => {
    if (hasLoadedOfferings.current) return;
    
    const loadOfferings = async () => {
      try {
        hasLoadedOfferings.current = true;
        await refreshOfferings();
        authLogger.info('[Paywall] Offerings refreshed');
        
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }).start();
      } catch (error) {
        authLogger.error('[Paywall] Error refreshing offerings', error);
      }
    };
    
    loadOfferings();
  }, [refreshOfferings, fadeAnimation]);

  // Debug console logs to help track the issue - but only log once
  useEffect(() => {
    authLogger.debug('[Paywall] Screen mounted. Current subscription status (from store):', { 
      hasActiveSubscription: useSubscriptionStore.getState().hasActiveSubscription, 
      isLoading: isSubscriptionLoading,
      redirect,
      userId: user?.id,
      hasPendingImage: !!pendingImageUri,
      hasOffering: !!currentOffering
    });
  }, []);

  // Navigate after successful subscription
  const handleSubscriptionSuccess = useCallback(async () => {
    authLogger.info('[Paywall] Subscription successful, attempting to navigate');
    justPurchasedOrRestored.current = true; // Mark that a purchase/restore just happened

    try {
      const hasSubscription = await ensureSubscriptionStatusChecked();
      authLogger.info(`[Paywall] Post-purchase/restore subscription check: ${hasSubscription ? 'ACTIVE' : 'INACTIVE'}`);
      updateSubscriptionStatus(hasSubscription); // Update auth context/store if you have one

      if (!hasSubscription) {
         authLogger.warn('[Paywall] Subscription check shows inactive after reported success. Navigating to default protected route.');
         router.replace('/(protected)/(tabs)/drips'); // Or your main app screen for subscribed users
         return;
      }
      
      // Use a fresh read from the store for pendingImageUri right before navigation decision
      const currentPendingImageUri = usePendingImageStore.getState().pendingImageUri;
      authLogger.info('[Paywall] Checked pendingImageUri from store', { currentPendingImageUri });

      if (currentPendingImageUri) {
        authLogger.info(`[Paywall] Pending image found (${currentPendingImageUri.substring(0,30)}...). Navigating directly to /camera.`);
        // Replace the entire stack and navigate to camera. CameraScreen will pick up pendingImageUri.
        router.replace('/(protected)/camera');
      } else {
        authLogger.info('[Paywall] No pending image. Navigating to default protected route.');
        router.replace('/(protected)/(tabs)/drips'); // Or your main app screen for subscribed users
      }
    } catch (error) {
      authLogger.error('[Paywall] Error during post-subscription navigation logic', error);
      router.replace('/(auth)/login'); // Fallback on critical error
    }
  }, [ensureSubscriptionStatusChecked, updateSubscriptionStatus, router, navigation /* navigation might not be needed if not using CommonActions.reset */]);

  // Handle successful purchase
  const handlePurchaseCompleted = useCallback((data: { customerInfo: any }) => {
    authLogger.info('[Paywall] Purchase completed, triggering subscription success flow.');
    justPurchasedOrRestored.current = true;
    handleSubscriptionSuccess();
  }, [handleSubscriptionSuccess]);

  // Handle successful restore
  const handleRestoreCompleted = useCallback((data: { customerInfo: any }) => {
    authLogger.info('[Paywall] Restore completed, triggering subscription success flow.');
    justPurchasedOrRestored.current = true;
    handleSubscriptionSuccess();
  }, [handleSubscriptionSuccess]);

  // Handle paywall dismiss
  const handlePaywallDismiss = () => {
    authLogger.info('[Paywall] Paywall dismiss action.', { justPurchased: justPurchasedOrRestored.current });
    if (justPurchasedOrRestored.current) {
        // If a purchase/restore just happened, handleSubscriptionSuccess already navigated.
        // Reset the flag for future dismissals.
        justPurchasedOrRestored.current = false;
        return; 
    }
    // If no purchase/restore happened, and paywall is dismissed.
    // The behavior here depends on where the user came from or app state.
    // If app/(protected)/pre-paywall-flow.tsx pushed this screen,
    // router.back() should take them there, which then navigates them back to initial-capture.
    authLogger.info('[Paywall] Dismissed without purchase. Navigating back.');
    if (router.canGoBack()) {
        router.back();
    } else {
        // Fallback if cannot go back (e.g., deep link to paywall)
        router.replace('/(auth)/login'); // Or your app's main entry for non-subscribed users
    }
  };

  // Render the RevenueCat UI Paywall
  const renderPaywall = () => {
    // Always preload and render the RevenueCat UI, but with opacity 0 until ready
    return (
      <View style={styles.container}>
        {currentOffering ? (
          <Animated.View style={[styles.container, { opacity: fadeAnimation }]}>
            <RevenueCatUI.Paywall
              options={currentOffering ? { offering: currentOffering } : undefined}
              onPurchaseCompleted={handlePurchaseCompleted}
              onRestoreCompleted={handleRestoreCompleted}
              onDismiss={handlePaywallDismiss}
            />
          </Animated.View>
        ) : (
          <SafeAreaView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00FF77" />
            <Text style={styles.loadingText}>
              Loading subscription options...
            </Text>
          </SafeAreaView>
        )}
      </View>
    );
  };

  // Removed PaywallGuard wrapper, directly render the paywall
  return renderPaywall();
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