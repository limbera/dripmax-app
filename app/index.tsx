import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  // Add a mounted ref to track safe navigation
  const isMounted = useRef(false);
  // Track navigation attempt count
  const navigationAttemptCount = useRef(0);

  // Set mounted status after first render
  useEffect(() => {
    console.log('[INDEX] Component mounted');
    isMounted.current = true;
    return () => {
      console.log('[INDEX] Component unmounted');
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Increment navigation attempt counter
    const currentAttempt = ++navigationAttemptCount.current;

    // Only proceed with navigation if component is mounted and auth is initialized
    if (!isMounted.current || !initialized) {
      console.log('[INDEX] Not ready for navigation yet, waiting...', { attempt: currentAttempt });
      return;
    }

    console.log('[INDEX] Preparing navigation', { 
      isAuthenticated, 
      hasActiveSubscription, 
      attempt: currentAttempt 
    });

    // Use setTimeout to defer navigation to next tick to avoid React warnings
    setTimeout(() => {
      // Check if this is still the most recent navigation attempt
      if (currentAttempt !== navigationAttemptCount.current) {
        console.log('[INDEX] Skipping outdated navigation attempt', {
          currentAttempt,
          latestAttempt: navigationAttemptCount.current
        });
        return;
      }

      if (isAuthenticated) {
        if (hasActiveSubscription) {
          console.log('[INDEX] User has subscription, redirecting to protected area');
          router.replace('/(protected)');
        } else {
          console.log('[INDEX] User authenticated but needs subscription, redirecting to paywall');
          router.replace('/(auth)/paywall' as any);
        }
      } else {
        console.log('[INDEX] Redirecting to login');
        router.replace('/(auth)/login');
      }
    }, 0);
  }, [isAuthenticated, initialized, hasActiveSubscription, router]);

  return (
    <View style={[styles.container, { backgroundColor: 'black' }]}>
      <ActivityIndicator size="large" color="#00FF77" />
      <Text style={[styles.text, { color: 'white', fontFamily: 'RobotoMono-Regular' }]}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
}); 