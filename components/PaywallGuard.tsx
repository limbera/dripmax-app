import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '../hooks/useSubscription';
import { authLogger } from '../utils/logger';
import { useAppStateStore, AppState } from '../stores/appStateStore';

// Fun fashion-related VIP/subscription messages
const SUBSCRIPTION_MESSAGES = [
  "Getting your VIP access ready...",
  "Rolling out the red carpet...",
  "Stitching together your premium experience...",
  "Confirming your fashion elite status...",
  "Polishing your virtual fashion crown...",
  "Prepping your style advisor...",
  "Finding the secret fashion insider door...",
  "Tailoring your premium experience...",
];

interface PaywallGuardProps {
  children: React.ReactNode;
  // Add a prop to disable loading state if needed
  disableLoading?: boolean;
}

/**
 * PaywallGuard - A component that prevents subscribed users from seeing the paywall
 * This acts as an additional safeguard to ensure users with active subscriptions
 * are immediately redirected to the protected area without ever seeing the paywall.
 */
export default function PaywallGuard({ children, disableLoading = false }: PaywallGuardProps) {
  const router = useRouter();
  const { hasActiveSubscription, isLoading, ensureSubscriptionStatusChecked } = useSubscription();
  const [isChecking, setIsChecking] = useState(false);
  const hasChecked = useRef(false);
  
  // Get app state to coordinate with global initialization
  const { currentState, isStateComplete } = useAppStateStore();
  const isAppInitializing = ![
    AppState.UNAUTHENTICATED,
    AppState.AUTHENTICATED_NO_SUB,
    AppState.AUTHENTICATED_WITH_SUB
  ].includes(currentState);
  
  // Animation and fun loading elements
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const [loadingMessage, setLoadingMessage] = useState(SUBSCRIPTION_MESSAGES[0]);
  const loadingInterval = useRef<NodeJS.Timeout | null>(null);
  const shimmerValue = useRef(new Animated.Value(0)).current;
  
  // Add fade transition animation for the entire component
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const [showContent, setShowContent] = useState(false);

  // Run subscription check only once when component mounts
  useEffect(() => {
    // Skip if we've already checked
    if (hasChecked.current) return;
    
    // Skip check if app is still initializing OR subscription check was already completed globally
    if (isAppInitializing || isStateComplete(AppState.CHECKING_SUBSCRIPTION)) {
      authLogger.info('[PaywallGuard] Skipping subscription check as app is still initializing or check was already done');
      // Show content immediately in this case without loading screen
      setShowContent(true);
      setIsChecking(false);
      hasChecked.current = true;
      return;
    }
    
    // Start loading animations and message cycling
    if (!disableLoading) {
      startLoadingEffects();
    }
    
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
        
        // Start fade transition instead of immediately setting isChecking to false
        startFadeTransition();
      } catch (error) {
        authLogger.error('[PaywallGuard] Error checking subscription:', error);
        // On error, default to showing the paywall with fade transition
        startFadeTransition();
      }
    };
    
    // Only perform the check if actually needed
    if (!disableLoading && !hasChecked.current) {
      checkSubscription();
    } else {
      // Skip check and just show content
      setShowContent(true);
      setIsChecking(false);
    }
    
    // Clean up animations when unmounting
    return () => {
      if (loadingInterval.current) {
        clearInterval(loadingInterval.current);
      }
      shimmerValue.stopAnimation();
      loadingTextOpacity.stopAnimation();
      fadeAnimation.stopAnimation();
    };
  }, [router, ensureSubscriptionStatusChecked, isChecking, isAppInitializing, disableLoading]);

  // Handle smooth transition from loading to content
  const startFadeTransition = () => {
    // Start by showing the content underneath, but still invisible
    setShowContent(true);
    
    // Allow a short delay (100ms) to ensure content is ready
    setTimeout(() => {
      // Start fading out the loading screen
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 400, // Slightly longer fade for smooth transition
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start(({ finished }) => {
        if (finished) {
          // After fade completes, actually remove the loading screen from DOM
          setIsChecking(false);
        }
      });
    }, 100);
  };
  
  // Start loading animations and cycling messages
  const startLoadingEffects = () => {
    // Cycle loading messages
    loadingInterval.current = setInterval(() => {
      // Fade out current text
      Animated.timing(loadingTextOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change text while invisible
        setLoadingMessage(SUBSCRIPTION_MESSAGES[Math.floor(Math.random() * SUBSCRIPTION_MESSAGES.length)]);
        
        // Fade in new text
        Animated.timing(loadingTextOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    
    // Start shimmer animation for premium effect
    startShimmerAnimation();
  };
  
  // Create a shimmering effect for the "premium" feel
  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };
  
  // Calculate the shimmer position
  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 200],
  });

  // Skip loading if app is still initializing or loading is disabled
  if (isAppInitializing || disableLoading) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      {/* Always render the children when showContent is true, but initially invisible */}
      {showContent && children}
      
      {/* Loading screen with fade animation */}
      {(isChecking || isLoading) && (
        <Animated.View 
          style={[
            styles.loadingContainer, 
            { opacity: fadeAnimation },
            styles.absoluteFill
          ]}
        >
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>Premium</Text>
            <Animated.View 
              style={[
                styles.shimmer, 
                { transform: [{ translateX: shimmerTranslate }] }
              ]} 
            />
          </View>
          
          <Animated.Text style={[styles.loadingText, { opacity: loadingTextOpacity }]}>
            {loadingMessage}
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
  },
  premiumBadge: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: 'rgba(82, 70, 0, 0.3)',
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
    overflow: 'hidden', // For shimmer effect
    position: 'relative', // For shimmer positioning
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginTop: 10,
  },
}); 