import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '../hooks/useSubscription';
import { authLogger } from '../utils/logger';

interface PaywallGuardProps {
  children: React.ReactNode;
}

/**
 * PaywallGuard - A component that prevents subscribed users from seeing the paywall
 * This acts as an additional safeguard to ensure users with active subscriptions
 * are immediately redirected to the protected area without ever seeing the paywall.
 */
export default function PaywallGuard({ children }: PaywallGuardProps) {
  const router = useRouter();
  const { hasActiveSubscription, isLoading, ensureSubscriptionStatusChecked } = useSubscription();
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);

  // Run subscription check only once when component mounts
  useEffect(() => {
    // Skip if we've already checked
    if (hasChecked.current) return;
    
    const checkSubscription = async () => {
      // Set checking flag to prevent multiple parallel checks
      if (!isChecking) return;
      
      try {
        authLogger.info('[PaywallGuard] Checking subscription status before showing paywall');
        
        // Mark as checked immediately to prevent multiple runs
        hasChecked.current = true;
        
        // Use the ensureSubscriptionStatusChecked method
        const hasSubscription = await ensureSubscriptionStatusChecked();
        
        authLogger.info('[PaywallGuard] Subscription check complete', { hasSubscription });
        
        // If the user has a subscription, redirect to protected area
        if (hasSubscription) {
          authLogger.info('[PaywallGuard] User has active subscription, redirecting to protected area');
          router.replace('/(protected)');
          return;
        }
        
        // Otherwise, allow paywall to show
        setIsChecking(false);
      } catch (error) {
        authLogger.error('[PaywallGuard] Error checking subscription:', error);
        // On error, default to showing the paywall
        setIsChecking(false);
      }
    };
    
    checkSubscription();
  }, [router, ensureSubscriptionStatusChecked, isChecking]);

  // Show loading while checking subscription status or while general subscription loading
  if (isChecking || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Checking subscription status...</Text>
      </View>
    );
  }

  // If we've checked and the user doesn't have a subscription, show the paywall
  return <>{children}</>;
}

const styles = StyleSheet.create({
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