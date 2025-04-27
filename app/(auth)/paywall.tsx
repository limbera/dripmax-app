import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, Animated, Easing } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { authLogger } from '../../utils/logger';

export default function PaywallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
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
  
  // Add fade transition animation
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [isPaywallReady, setIsPaywallReady] = useState(false);

  // Make sure offerings are loaded only once
  useEffect(() => {
    if (hasLoadedOfferings.current) return;
    
    const loadOfferings = async () => {
      try {
        hasLoadedOfferings.current = true;
        await refreshOfferings();
        authLogger.info('[Paywall] Offerings refreshed');
        
        // When offerings are loaded, mark paywall as ready and fade it in
        setIsPaywallReady(true);
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
      // Update subscription status - FORCE REFRESH
      const hasSubscription = await ensureSubscriptionStatusChecked();
      authLogger.info(`[Paywall] Subscription check after purchase: ${hasSubscription ? 'ACTIVE' : 'INACTIVE'}`);
      
      // This might still be needed if AppNavigator hasn't updated the auth state yet
      updateSubscriptionStatus(hasSubscription);

      if (!hasSubscription) {
         // Should not happen ideally, but handle defensively
         authLogger.warn('[Paywall] Purchase reported success but check shows inactive. Navigating to onboarding.');
         router.replace('/(onboarding)/capture'); 
         return;
      }
      
      // --- Reset Navigation Stack --- 
      if (pendingImageUri) {
        // If there's a pending image, reset stack to Drips -> Camera
        authLogger.info('[Paywall] Pending image found, resetting stack to /(protected)/camera');
        navigation.dispatch(
          CommonActions.reset({
            index: 1, // Camera is active
            routes: [
              { name: '(protected)' as never }, // Use screen name or path
              { name: '(protected)/camera' as never } // Use screen name or path
            ],
          })
        );
      } else {
        // Otherwise reset stack to just Drips
        authLogger.info('[Paywall] No pending image, resetting stack to /(protected)');
        navigation.dispatch(
          CommonActions.reset({
            index: 0, // Drips is active
            routes: [
              { name: '(protected)' as never } // Use screen name or path
            ],
          })
        );
      }
    } catch (error) {
      authLogger.error('[Paywall] Error after subscription', error);
      // Fallback: Navigate to login on error
      router.replace('/(auth)/login');
    }
  }, [navigation, ensureSubscriptionStatusChecked, pendingImageUri, updateSubscriptionStatus]);

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