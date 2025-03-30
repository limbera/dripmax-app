import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { navigationLogger } from '../utils/logger';

/**
 * Custom hook to handle protected route navigation
 * Redirects unauthenticated users to the login screen
 * Redirects authenticated but non-subscribed users to the onboarding flow
 * 
 * Note: This is being replaced by the AuthTransitionManager component
 * but is kept for backward compatibility
 */
export function useProtectedRoute() {
  const { isAuthenticated, initialized, user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const segments = useSegments();
  const router = useRouter();
  // Add a ref to track if navigation is safe to perform
  const isMounted = useRef(false);
  // Add a counter to ensure navigation only happens once per state change
  const navigationAttemptCount = useRef(0);
  // Track the last known authentication state
  const lastAuthState = useRef({ isAuthenticated, initialized, hasActiveSubscription });
  // Check if we should short-circuit due to using the new transition manager
  const usingNewTransitionManager = true; // Set to true to use the new AuthTransitionManager

  // Set mounted status after first render
  useEffect(() => {
    navigationLogger.debug('useProtectedRoute mounted');
    isMounted.current = true;
    return () => {
      navigationLogger.debug('useProtectedRoute unmounted');
      isMounted.current = false;
    };
  }, []);

  // If using the new transition manager, short-circuit this hook
  if (usingNewTransitionManager) {
    navigationLogger.debug('Using new AuthTransitionManager, short-circuiting useProtectedRoute');
    return;
  }

  // Track when auth state changes to force navigation effect to run
  useEffect(() => {
    if (usingNewTransitionManager) return;
    
    const authStateChanged = 
      lastAuthState.current.isAuthenticated !== isAuthenticated ||
      lastAuthState.current.initialized !== initialized ||
      lastAuthState.current.hasActiveSubscription !== hasActiveSubscription;
      
    if (authStateChanged) {
      navigationLogger.debug('Auth state changed, updating last known state', {
        prevAuthenticated: lastAuthState.current.isAuthenticated,
        newAuthenticated: isAuthenticated,
        prevInitialized: lastAuthState.current.initialized,
        newInitialized: initialized,
        prevSubscription: lastAuthState.current.hasActiveSubscription,
        newSubscription: hasActiveSubscription,
      });
      
      lastAuthState.current = { isAuthenticated, initialized, hasActiveSubscription };
    }
  }, [isAuthenticated, initialized, hasActiveSubscription, usingNewTransitionManager]);

  // Handle navigation based on authentication state
  useEffect(() => {
    if (usingNewTransitionManager) return;
    
    // Increment the navigation attempt count to track state changes
    const currentAttempt = ++navigationAttemptCount.current;

    navigationLogger.debug('useProtectedRoute effect running', {
      isAuthenticated,
      initialized,
      hasActiveSubscription,
      hasUser: !!user,
      userId: user?.id,
      segments,
      isMounted: isMounted.current,
      navigationAttempt: currentAttempt
    });

    // Don't proceed if not mounted or not initialized
    if (!isMounted.current || !initialized) {
      navigationLogger.debug('Navigation not ready yet, skipping navigation', {
        navigationAttempt: currentAttempt
      });
      return;
    }

    // Check if the current route is in the auth group
    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(protected)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const isRootRoute = segments.length === 1 && !segments[0];
    
    // Check if current route is the paywall route - use a safer approach
    const isPaywallRoute = inAuthGroup && segments.length > 1 && segments[1] && segments[1].includes('paywall');
    // Check if current route is the login route
    const isLoginRoute = inAuthGroup && segments.length > 1 && segments[1] && segments[1].includes('login');
    
    // Use a higher delay for paywall route to allow more time for subscription to process
    const navigationDelay = isPaywallRoute ? 1000 : 0;
    
    navigationLogger.info('Current navigation state', {
      inAuthGroup,
      inProtectedGroup,
      inOnboardingGroup,
      isRootRoute,
      isPaywallRoute,
      isLoginRoute,
      currentSegment: segments[0],
      hasActiveSubscription,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      navigationAttempt: currentAttempt,
      navigationDelay
    });
    
    // Use setTimeout to defer navigation to next tick to avoid React warnings
    setTimeout(() => {
      // Check if this is still the most recent navigation attempt
      if (currentAttempt !== navigationAttemptCount.current) {
        navigationLogger.debug('Skipping outdated navigation', {
          currentAttempt,
          latestAttempt: navigationAttemptCount.current
        });
        return;
      }

      if (!isAuthenticated && !inAuthGroup) {
        // Redirect to the login page if not authenticated and not already in the auth group
        navigationLogger.info('Not authenticated and not in auth group, redirecting to login', {
          navigationAttempt: currentAttempt
        });
        try {
          router.replace('/(auth)/login');
          navigationLogger.info('Redirected to login');
        } catch (error) {
          navigationLogger.error('Error redirecting to login', {
            error: (error as Error).message,
            stack: (error as Error).stack
          });
        }
      } else if (isAuthenticated && hasActiveSubscription) {
        // HIGHEST PRIORITY: If user has an active subscription, always send them to protected area
        // This takes precedence over any other routing rule for authenticated users
        if (!inProtectedGroup) {
          navigationLogger.info('User has active subscription, redirecting to protected area', {
            navigationAttempt: currentAttempt,
            currentLocation: segments.join('/')
          });
          try {
            router.replace('/(protected)');
            navigationLogger.info('Redirected to protected area');
          } catch (error) {
            navigationLogger.error('Error redirecting to protected area', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        }
      } else if (isAuthenticated && isLoginRoute) {
        // User is authenticated but still on login screen, redirect based on subscription status
        if (hasActiveSubscription) {
          navigationLogger.info('Authenticated user on login screen with subscription, redirecting to protected area', {
            navigationAttempt: currentAttempt
          });
          try {
            router.replace('/(protected)');
            navigationLogger.info('Redirected from login to protected area');
          } catch (error) {
            navigationLogger.error('Error redirecting from login to protected area', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        } else {
          navigationLogger.info('Authenticated user on login screen without subscription, redirecting to onboarding', {
            navigationAttempt: currentAttempt
          });
          try {
            router.replace('/(onboarding)/capture');
            navigationLogger.info('Redirected from login to onboarding');
          } catch (error) {
            navigationLogger.error('Error redirecting from login to onboarding', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        }
      } else if (isAuthenticated && hasActiveSubscription && (inOnboardingGroup || isPaywallRoute)) {
        // Redirect to protected area if user has subscription but is in onboarding or paywall
        navigationLogger.info('Authenticated with subscription in onboarding/paywall, redirecting to protected area', {
          navigationAttempt: currentAttempt
        });
        try {
          router.replace('/(protected)');
          navigationLogger.info('Redirected from onboarding/paywall to protected area');
        } catch (error) {
          navigationLogger.error('Error redirecting from onboarding/paywall to protected area', {
            error: (error as Error).message,
            stack: (error as Error).stack
          });
        }
      } else if (isAuthenticated && !hasActiveSubscription && !inOnboardingGroup && !isPaywallRoute && inProtectedGroup) {
        // Redirect to onboarding if authenticated but no subscription and trying to access protected content
        navigationLogger.info('Authenticated but no subscription, redirecting to onboarding', {
          navigationAttempt: currentAttempt
        });
        try {
          router.replace('/(onboarding)/capture');
          navigationLogger.info('Redirected to onboarding');
        } catch (error) {
          navigationLogger.error('Error redirecting to onboarding', {
            error: (error as Error).message,
            stack: (error as Error).stack
          });
        }
      } else if (isAuthenticated && ((inAuthGroup && !isPaywallRoute && !isLoginRoute) || isRootRoute)) {
        // Handle other auth screens or root route for authenticated users
        // Determine where to redirect based on subscription status
        if (hasActiveSubscription) {
          // If user has subscription, go to protected area
          navigationLogger.info('Authenticated with subscription, redirecting to protected area', {
            navigationAttempt: currentAttempt
          });
          try {
            router.replace('/(protected)');
            navigationLogger.info('Redirected to protected area');
          } catch (error) {
            navigationLogger.error('Error redirecting to protected area', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        } else {
          // If no subscription, go to onboarding flow
          navigationLogger.info('Authenticated without subscription, redirecting to onboarding', {
            navigationAttempt: currentAttempt
          });
          try {
            router.replace('/(onboarding)/capture');
            navigationLogger.info('Redirected to onboarding');
          } catch (error) {
            navigationLogger.error('Error redirecting to onboarding', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        }
      } else {
        navigationLogger.debug('No navigation change needed', {
          navigationAttempt: currentAttempt
        });
      }
    }, navigationDelay);
  }, [isAuthenticated, hasActiveSubscription, initialized, segments, router, user, usingNewTransitionManager]);
} 