import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { navigationLogger } from '../utils/logger';

/**
 * Custom hook to handle protected route navigation
 * Redirects unauthenticated users to the login screen
 * Redirects authenticated but non-subscribed users to the paywall
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

  // Set mounted status after first render
  useEffect(() => {
    navigationLogger.debug('useProtectedRoute mounted');
    isMounted.current = true;
    return () => {
      navigationLogger.debug('useProtectedRoute unmounted');
      isMounted.current = false;
    };
  }, []);

  // Track when auth state changes to force navigation effect to run
  useEffect(() => {
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
  }, [isAuthenticated, initialized, hasActiveSubscription]);

  // Handle navigation based on authentication state
  useEffect(() => {
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
    const isRootRoute = segments.length === 1 && !segments[0];
    
    // Check if current route is the paywall route - use a safer approach
    const isPaywallRoute = inAuthGroup && segments.length > 1 && segments[1] && segments[1].includes('paywall');
    // Check if current route is the login route
    const isLoginRoute = inAuthGroup && segments.length > 1 && segments[1] && segments[1].includes('login');
    
    navigationLogger.info('Current navigation state', {
      inAuthGroup,
      inProtectedGroup,
      isRootRoute,
      isPaywallRoute,
      isLoginRoute,
      currentSegment: segments[0],
      hasActiveSubscription,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      navigationAttempt: currentAttempt
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
          navigationLogger.info('Authenticated user on login screen without subscription, redirecting to paywall', {
            navigationAttempt: currentAttempt
          });
          try {
            router.replace('/(auth)/paywall' as any);
            navigationLogger.info('Redirected from login to paywall');
          } catch (error) {
            navigationLogger.error('Error redirecting from login to paywall', {
              error: (error as Error).message,
              stack: (error as Error).stack
            });
          }
        }
      } else if (isAuthenticated && !hasActiveSubscription && !isPaywallRoute && inProtectedGroup) {
        // Redirect to paywall if authenticated but no subscription and trying to access protected content
        navigationLogger.info('Authenticated but no subscription, redirecting to paywall', {
          navigationAttempt: currentAttempt
        });
        try {
          // Use type assertion to help TypeScript understand this is a valid route
          router.replace('/(auth)/paywall' as any);
          navigationLogger.info('Redirected to paywall');
        } catch (error) {
          navigationLogger.error('Error redirecting to paywall', {
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
          // If no subscription, go to paywall
          navigationLogger.info('Authenticated without subscription, redirecting to paywall', {
            navigationAttempt: currentAttempt
          });
          try {
            // Use type assertion to help TypeScript understand this is a valid route
            router.replace('/(auth)/paywall' as any);
            navigationLogger.info('Redirected to paywall');
          } catch (error) {
            navigationLogger.error('Error redirecting to paywall', {
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
    }, 0);
  }, [isAuthenticated, hasActiveSubscription, initialized, segments, router, user]);
} 