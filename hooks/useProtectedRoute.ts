import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';
import { navigationLogger } from '../utils/logger';

/**
 * Custom hook to handle protected route navigation
 * Redirects unauthenticated users to the login screen
 */
export function useProtectedRoute() {
  const { isAuthenticated, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    navigationLogger.debug('useProtectedRoute effect running', {
      isAuthenticated,
      initialized,
      segments
    });

    if (!initialized) {
      navigationLogger.debug('Auth not initialized yet, skipping navigation');
      return;
    }

    // Check if the current route is in the auth group
    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(protected)';
    const isRootRoute = segments.length === 1 && !segments[0];
    
    navigationLogger.debug('Current navigation state', {
      inAuthGroup,
      inProtectedGroup,
      isRootRoute,
      currentSegment: segments[0]
    });
    
    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the login page if not authenticated and not already in the auth group
      navigationLogger.info('Not authenticated and not in auth group, redirecting to login');
      try {
        router.replace('/(auth)/login');
        navigationLogger.info('Redirected to login');
      } catch (error) {
        navigationLogger.error('Error redirecting to login', {
          error: (error as Error).message,
          stack: (error as Error).stack
        });
      }
    } else if (isAuthenticated && (inAuthGroup || isRootRoute)) {
      // Redirect to the protected area if authenticated and in auth group or at root
      navigationLogger.info('Authenticated and in auth group or at root, redirecting to protected area');
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
      navigationLogger.debug('No navigation change needed');
    }
  }, [isAuthenticated, initialized, segments, router]);
} 