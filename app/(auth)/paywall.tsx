import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import PaywallGuard from '../../components/PaywallGuard';

export default function PaywallScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { currentOffering, isLoading, hasActiveSubscription, checkEntitlementStatus } = useSubscription();
  const { user } = useAuth();
  const { pendingImageUri } = usePendingImageStore();

  // Debug console logs to help track the issue
  useEffect(() => {
    console.log('[Paywall DEBUG] Current subscription status:', { 
      hasActiveSubscription, 
      isLoading,
      redirect,
      userId: user?.id,
      hasPendingImage: !!pendingImageUri
    });
  }, [hasActiveSubscription, isLoading, redirect, user, pendingImageUri]);

  // Handle successful purchase
  const handlePurchaseCompleted = useCallback(async () => {
    console.log('[Paywall] Purchase completed, refreshing subscription status and navigating');
    
    try {
      // Refresh subscription status
      await checkEntitlementStatus();
      console.log('[Paywall] Subscription status refreshed after purchase:', { 
        hasActiveSubscription,
        hasPendingImage: !!pendingImageUri
      });
      
      // Force immediate navigation to protected area with a small delay
      // Use replaceAll to bypass navigation protection
      setTimeout(() => {
        console.log('[Paywall] Forcing navigation to protected area');
        
        // Let the AuthTransitionManager handle routing based on pending image
        // We'll just navigate to the root protected area
        // @ts-ignore - replaceAll is not in the type definitions but exists in the router
        if (router.replaceAll) {
          // @ts-ignore
          router.replaceAll('/(protected)');
        } else {
          router.replace('/(protected)');
        }
      }, 500);
    } catch (error) {
      console.error('[Paywall] Error refreshing subscription status:', error);
      // Navigate anyway
      router.replace('/(protected)');
    }
  }, [router, checkEntitlementStatus, hasActiveSubscription, pendingImageUri]);

  // Handle successful restore
  const handleRestoreCompleted = useCallback(() => {
    console.log('[Paywall] Restore completed, checking subscription status');
    
    // If user has subscription after restore, go to protected area
    if (hasActiveSubscription) {
      router.replace('/(protected)');
    }
  }, [hasActiveSubscription, router]);

  // Handle paywall dismiss (either by close button or successful purchase)
  const handlePaywallDismiss = () => {
    console.log('[Paywall] Paywall dismissed, checking subscription status');
    
    // If user has subscription after dismiss, go to protected area
    // Otherwise, go back to login (user pressed close)
    if (hasActiveSubscription) {
      router.replace('/(protected)');
    } else {
      // Usually we'd go back, but in our flow we want to keep them here until they subscribe
      // So we don't navigate away
    }
  };

  // Render function that will only run if PaywallGuard allows it
  const renderPaywall = () => {
    if (isLoading) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FF77" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
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

  // Wrap the entire paywall in our guard component
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
    fontFamily: 'RobotoMono-Regular',
  },
}); 