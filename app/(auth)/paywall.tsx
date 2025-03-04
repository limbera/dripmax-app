import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';

export default function PaywallScreen() {
  const router = useRouter();
  const { currentOffering, isLoading, hasActiveSubscription } = useSubscription();
  const { user } = useAuth();

  // Check if user already has a subscription when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (hasActiveSubscription) {
        console.log('[Paywall] User has active subscription, redirecting to protected area');
        router.replace('/(protected)');
      }
    }, [hasActiveSubscription, router])
  );

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

  // Handle successful purchase
  const handlePurchaseCompleted = useCallback(() => {
    console.log('[Paywall] Purchase completed, navigating to protected area');
    router.replace('/(protected)');
  }, [router]);

  // Handle successful restore
  const handleRestoreCompleted = useCallback(() => {
    console.log('[Paywall] Restore completed, checking subscription status');
    
    // If user has subscription after restore, go to protected area
    if (hasActiveSubscription) {
      router.replace('/(protected)');
    }
  }, [hasActiveSubscription, router]);

  // Alternative approach using presentPaywall (can be used instead of the component)
  const presentPaywall = async () => {
    try {
      // Only pass the offering if it's not null, otherwise pass an empty object
      const options = currentOffering ? { offering: currentOffering } : {};
      const paywallResult = await RevenueCatUI.presentPaywall(options);
      
      console.log('[Paywall] Paywall result:', paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          router.replace('/(protected)');
          return true;
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (error) {
      console.error('[Paywall] Error presenting paywall:', error);
      return false;
    }
  };

  // Present the paywall when component mounts if using the presentPaywall approach
  // Uncomment this if you prefer using presentPaywall instead of the component
  /*
  useEffect(() => {
    if (!isLoading && !hasActiveSubscription && currentOffering) {
      presentPaywall();
    }
  }, [isLoading, hasActiveSubscription, currentOffering]);
  */

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </SafeAreaView>
    );
  }

  // Using the RevenueCatUI.Paywall component approach (preferred)
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