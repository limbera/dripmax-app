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
    authLogger.info('[Paywall] Subscription successful, navigating');
    let targetRoute = '/(protected)';
    
    try {
      const hasSubscription = await ensureSubscriptionStatusChecked();
      authLogger.info(`[Paywall] Subscription check after purchase: ${hasSubscription ? 'ACTIVE' : 'INACTIVE'}`);
      updateSubscriptionStatus(hasSubscription);

      if (!hasSubscription) {
         authLogger.warn('[Paywall] Purchase reported success but check shows inactive. Navigating to protected area as fallback.');
         router.replace('/(protected)');
         return;
      }
      
      if (pendingImageUri) {
        targetRoute = '/(protected)/camera';
        authLogger.info(`[Paywall] Pending image found, resetting stack to ${targetRoute}`);
        navigation.dispatch(
          CommonActions.reset({
            index: 1, 
            routes: [
              { name: '(protected)' as never }, 
              { name: '(protected)/camera' as never } 
            ],
          })
        );
      } else {
        targetRoute = '/(protected)';
        authLogger.info(`[Paywall] No pending image, resetting stack to ${targetRoute}`);
        navigation.dispatch(
          CommonActions.reset({
            index: 0, 
            routes: [
              { name: '(protected)' as never } 
            ],
          })
        );
      }
      authLogger.info(`[Paywall] Navigation target after success: ${targetRoute}`);
    } catch (error) {
      authLogger.error('[Paywall] Error after subscription', error);
      router.replace('/(auth)/login');
    }
  }, [navigation, ensureSubscriptionStatusChecked, pendingImageUri, updateSubscriptionStatus, router]);

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
    authLogger.info('[Paywall] Paywall dismiss action triggered.', { justPurchasedOrRestored: justPurchasedOrRestored.current });
    
    if (justPurchasedOrRestored.current) {
      authLogger.info('[Paywall] Dismissed after a successful purchase/restore. Navigation handled by success callback.');
      justPurchasedOrRestored.current = false;
    } else {
      if (useSubscriptionStore.getState().hasActiveSubscription) {
        authLogger.info('[Paywall] Dismissed by an already subscribed user. No navigation needed or already handled.');
      } else {
        authLogger.info('[Paywall] Dismissed without purchase by a non-subscribed user. Navigating back.');
        if (router.canGoBack()) {
          router.back();
        }
      }
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