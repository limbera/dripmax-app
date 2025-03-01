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

  // Log when auth state changes
  useEffect(() => {
    authLogger.debug('Auth state updated', {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      initialized,
      isAuthenticated: !!session
    });
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