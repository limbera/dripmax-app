import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authLogger } from '../utils/logger';

export const useAuth = () => {
  const { 
    user, 
    session, 
    isLoading, 
    error, 
    initialized,
    initialize, 
    signInWithGoogle, 
    signInWithApple, 
    signOut 
  } = useAuthStore();

  // Initialize auth if not already initialized
  useEffect(() => {
    authLogger.debug('useAuth effect running', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      initialized
    });

    if (!initialized) {
      authLogger.info('Auth not initialized, calling initialize');
      initialize();
    }
  }, [initialized, initialize, user, session, isLoading]);

  // Enhanced logging for auth state changes
  useEffect(() => {
    const isAuthenticated = !!session;
    
    authLogger.debug('Auth state updated in useAuth hook', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      initialized,
      isAuthenticated
    });
    
    // Force update of auth-dependent components
    if (initialized && !isLoading && isAuthenticated) {
      authLogger.info('User authenticated and initialization complete');
    }
  }, [user, session, isLoading, initialized]);

  return {
    user,
    session,
    isLoading,
    error,
    initialized,
    isAuthenticated: !!session,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
}; 