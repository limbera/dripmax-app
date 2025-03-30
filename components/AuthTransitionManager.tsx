import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { usePendingImageStore } from '../stores/pendingImageStore';

/**
 * AuthTransitionManager
 * 
 * This component handles authentication transitions and prevents screen flashing
 * during login/logout by maintaining a loading screen while auth state is changing.
 */
export default function AuthTransitionManager() {
  const { isAuthenticated, isLoading: authLoading, initialized: authInitialized } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [lastAuthState, setLastAuthState] = useState<boolean | null>(null);
  const [lastSubscriptionState, setLastSubscriptionState] = useState<boolean | null>(null);
  const [transitionTimeoutId, setTransitionTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { pendingImageUri } = usePendingImageStore();
  
  // Track if we're handling a sign out transition specifically
  const isSigningOut = useRef(false);
  // Track if this is the first navigation after initialization
  const isInitialNavigation = useRef(true);
  // Debounce navigation to prevent multiple rapid redirects
  const lastNavigationTime = useRef(0);
  // Track if a subscription was just activated
  const subscriptionActivated = useRef(false);
  // Track the most recent segments to detect intentional navigation
  const previousSegments = useRef<string[]>([]);
  // Flag to indicate if we're in a user-initiated navigation
  const isUserNavigation = useRef(false);
  
  // Detect sign out transition by comparing previous and current auth state
  useEffect(() => {
    if (lastAuthState === true && isAuthenticated === false) {
      console.log('[AuthTransition] Sign out detected');
      isSigningOut.current = true;
    }
  }, [isAuthenticated, lastAuthState]);
  
  // Detect intentional user navigation by comparing segments
  useEffect(() => {
    // If segments have changed without auth state changes, it's likely user navigation
    if (previousSegments.current.length > 0 && 
        previousSegments.current[0] !== segments[0] && 
        lastAuthState === isAuthenticated &&
        lastSubscriptionState === hasActiveSubscription) {
      
      console.log('[AuthTransition] User-initiated navigation detected', {
        from: previousSegments.current[0],
        to: segments[0]
      });
      
      isUserNavigation.current = true;
      
      // Reset the flag after a short period
      setTimeout(() => {
        isUserNavigation.current = false;
      }, 2000);
    }
    
    // Update previous segments
    previousSegments.current = [...segments];
  }, [segments, isAuthenticated, hasActiveSubscription, lastAuthState, lastSubscriptionState]);

  // Detect subscription activation
  useEffect(() => {
    // If user just gained a subscription, set the flag
    if (lastSubscriptionState === false && hasActiveSubscription === true) {
      console.log('[AuthTransition] Subscription activated');
      subscriptionActivated.current = true;
    }
  }, [hasActiveSubscription, lastSubscriptionState]);

  // Function to navigate to the appropriate destination with debouncing
  const navigateToDestination = () => {
    // Don't override user navigation
    if (isUserNavigation.current) {
      console.log('[AuthTransition] Skipping auto-navigation during user navigation');
      return;
    }
    
    const now = Date.now();
    // Prevent multiple navigations within 500ms
    if (now - lastNavigationTime.current < 500) {
      console.log('[AuthTransition] Navigation debounced');
      return;
    }
    
    lastNavigationTime.current = now;
    
    console.log('[AuthTransition] Navigating to destination', {
      isAuthenticated,
      hasActiveSubscription,
      currentSegment: segments[0],
      isSigningOut: isSigningOut.current,
      isInitial: isInitialNavigation.current,
      subscriptionActivated: subscriptionActivated.current,
      hasPendingImage: !!pendingImageUri
    });

    if (!isAuthenticated) {
      // If not authenticated, go to login
      router.replace('/(auth)/login');
    } else if (hasActiveSubscription) {
      // If authenticated and has subscription, determine where to go
      
      // Check if this is a newly activated subscription and there's a pending image
      if (subscriptionActivated.current && pendingImageUri) {
        console.log('[AuthTransition] Directing newly subscribed user to camera with pending image');
        // Route to camera screen to process the pending image
        router.replace('/(protected)/camera');
        // Reset the subscription activated flag
        subscriptionActivated.current = false;
      } else {
        // Otherwise, go to normal protected area
        router.replace('/(protected)');
      }
    } else {
      // If authenticated but no subscription, go to onboarding
      router.replace('/(onboarding)/capture');
    }
    
    // Reset sign out flag after navigation
    isSigningOut.current = false;
    // No longer the initial navigation
    isInitialNavigation.current = false;
  };

  // Monitor for state changes that would trigger a transition
  useEffect(() => {
    // If we're not initialized yet, don't do anything
    if (!authInitialized && isInitialNavigation.current) {
      return;
    }
    
    // Don't show transition screen during user navigation
    if (isUserNavigation.current) {
      setIsTransitioning(false);
      return;
    }
    
    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(protected)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    
    // Define allowed navigation paths that shouldn't be intercepted
    const allowedNavigationPaths = [
      // From onboarding results to paywall
      { from: '(onboarding)', to: '(auth)', toSubpath: 'paywall' },
      // From paywall back to onboarding (via back button)
      { from: '(auth)', fromSubpath: 'paywall', to: '(onboarding)' },
      // Navigation within onboarding flow
      { from: '(onboarding)', to: '(onboarding)' }
    ];
    
    // Check if current navigation matches any allowed paths
    const isAllowedNavigation = allowedNavigationPaths.some(path => {
      const fromMatches = previousSegments.current[0] === path.from;
      const fromSubpathMatches = !path.fromSubpath || 
        (previousSegments.current.length > 1 && previousSegments.current[1].includes(path.fromSubpath));
      const toMatches = segments[0] === path.to;
      const toSubpathMatches = !path.toSubpath || 
        (segments.length > 1 && segments[1].includes(path.toSubpath));
      
      return fromMatches && fromSubpathMatches && toMatches && toSubpathMatches;
    });
    
    // Special cases where we want to allow navigation without intercepting
    const isPaywallNavigation = inAuthGroup && segments.length > 1 && segments[1] === 'paywall';
    // Also check for transitions from results to paywall
    const isResultsToPaywallNavigation = 
      previousSegments.current.length > 0 && 
      previousSegments.current[0] === '(onboarding)' &&
      segments[0] === '(auth)' &&
      segments.length > 1 && 
      segments[1] === 'paywall';
    
    // Log for debugging
    console.log('[AuthTransition] Auth state changed', {
      isAuthenticated,
      hasActiveSubscription,
      authLoading,
      subscriptionLoading,
      authInitialized,
      currentSegment: segments[0],
      isSigningOut: isSigningOut.current,
      isInitial: isInitialNavigation.current,
      isUserNavigation: isUserNavigation.current,
      isPaywallNavigation,
      isResultsToPaywallNavigation,
      isAllowedNavigation,
      previousPath: previousSegments.current.join('/'),
      currentPath: segments.join('/')
    });

    // Clear any existing transition timeout
    if (transitionTimeoutId) {
      clearTimeout(transitionTimeoutId);
      setTransitionTimeoutId(null);
    }

    // Check if auth state has changed
    const authChanged = lastAuthState !== null && lastAuthState !== isAuthenticated;
    // Check if subscription state has changed
    const subscriptionChanged = lastSubscriptionState !== null && lastSubscriptionState !== hasActiveSubscription;
    
    // Don't interfere with allowed navigations
    if (isPaywallNavigation || isResultsToPaywallNavigation || isAllowedNavigation) {
      setIsTransitioning(false);
      return;
    }
    
    // Special handling for signing out or loading states
    if (isSigningOut.current || authLoading || subscriptionLoading || !authInitialized || authChanged || subscriptionChanged) {
      setIsTransitioning(true);
      
      // For sign out, we want a slightly longer delay to ensure a clean transition
      const transitionDelay = isSigningOut.current ? 1500 : 1000;
      
      // Set a timeout to ensure we don't get stuck in the transition state
      const timeoutId = setTimeout(() => {
        setIsTransitioning(false);
        navigateToDestination();
      }, transitionDelay);
      
      setTransitionTimeoutId(timeoutId);
    } else if (lastAuthState !== null && lastSubscriptionState !== null) {
      // Both states have been initialized at least once and are now stable
      
      const isInCorrectGroup = 
        (!isAuthenticated && inAuthGroup) ||
        (isAuthenticated && hasActiveSubscription && inProtectedGroup) ||
        (isAuthenticated && !hasActiveSubscription && inOnboardingGroup);
      
      // If we're not in the correct group, navigate to the right destination
      if (!isInCorrectGroup) {
        // Small delay to ensure consistency
        const timeoutId = setTimeout(() => {
          navigateToDestination();
        }, 50);
        
        setTransitionTimeoutId(timeoutId);
      } else {
        // If we're already in the right place, just exit the transition state
        setIsTransitioning(false);
      }
    }
    
    // Update last known states
    setLastAuthState(isAuthenticated);
    setLastSubscriptionState(hasActiveSubscription);
    
    // Clean up timeout on unmount
    return () => {
      if (transitionTimeoutId) {
        clearTimeout(transitionTimeoutId);
      }
    };
  }, [isAuthenticated, hasActiveSubscription, authLoading, subscriptionLoading, authInitialized, segments]);

  // If in transition state, show the loading screen
  if (isTransitioning) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Otherwise, return null - the normal router will handle navigation
  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Make sure it's on top of everything
  },
  text: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
  }
}); 