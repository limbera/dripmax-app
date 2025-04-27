import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase, setupAuthStateListener, ensureGarmentsBucket, purgeAuthStorage } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { authLogger } from '../utils/logger';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleAuthAvailable, formatAppleUserData } from '../utils/appleAuth';
import Constants from 'expo-constants';
import { linkUserWithNotifications, unlinkUserFromNotifications } from '../utils/notificationUtils';
import { useOutfitStore } from './outfitStore';
import { useSubscriptionStore } from './subscriptionStore';
import { trackEvent, ANALYTICS_EVENTS, resetUser as resetAnalyticsUser } from '../utils/analytics';
import * as SecureStore from 'expo-secure-store';

// Define the WebBrowser result type to include the URL property
interface WebBrowserAuthSessionResult {
  type: 'success' | 'cancel' | 'dismiss' | 'locked';
  url?: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  setupAuthListener: () => () => void;
  cleanAuthTokens: () => Promise<boolean>;
}

// Register the redirect URI for deep linking
WebBrowser.maybeCompleteAuthSession();

// Parse the URL parameters, handling both query params and fragments
const parseUrlParams = (url: string) => {
  const params: Record<string, string> = {};
  
  try {
    authLogger.debug('Parsing URL', { url: url.substring(0, 50) + '...' });
    
    // Check if the URL has a fragment
    const fragmentIndex = url.indexOf('#');
    if (fragmentIndex !== -1) {
      // Get the fragment part (everything after #)
      const fragment = url.substring(fragmentIndex + 1);
      authLogger.debug('Found fragment in URL', { fragment: fragment.substring(0, 30) + '...' });
      
      // Parse the fragment
      fragment.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    } else {
      // Use the original regex for query parameters
      const regex = /[?&]([^=#]+)=([^&#]*)/g;
      let match;
      
      while ((match = regex.exec(url)) !== null) {
        params[match[1]] = decodeURIComponent(match[2]);
      }
    }
    
    authLogger.debug('Parsed parameters', { 
      paramCount: Object.keys(params).length,
      keys: Object.keys(params)
    });
  } catch (error) {
    authLogger.error('Error parsing URL parameters', { error: (error as Error).message });
  }
  
  return params;
};

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    session: null,
    user: null,
    isLoading: false,
    error: null,
    initialized: false,

    setupAuthListener: () => {
      authLogger.debug('Setting up auth listener from auth store');
      
      // Set up the auth state listener using the imported function
      return setupAuthStateListener((session) => {
        authLogger.debug('Auth state listener callback', {
          hasSession: !!session,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email
          } : null
        });
        
        // Get previous session to detect sign-in/sign-out
        const previousSession = get().session;
        const wasSignedIn = !!previousSession?.user;
        const isSignedIn = !!session?.user;
        
        // Update the state with the new session information
        set(state => {
          authLogger.debug('Updating auth store with new session state', {
            previouslyInitialized: state.initialized,
            previouslyAuthenticated: !!state.session
          });
          
          state.session = session;
          state.user = session?.user || null;
          state.isLoading = false;
          state.initialized = true;
        });
        
        // Link user with OneSignal on sign-in
        if (!wasSignedIn && isSignedIn && session?.user) {
          authLogger.debug('User signed in, linking with OneSignal', {
            userId: session.user.id
          });
          linkUserWithNotifications(session.user.id).catch(error => {
            authLogger.error('Error linking user with notifications', error);
          });
        }
        
        // Unlink user from OneSignal on sign-out
        if (wasSignedIn && !isSignedIn) {
          authLogger.debug('User signed out, unlinking from OneSignal');
          unlinkUserFromNotifications().catch(error => {
            authLogger.error('Error unlinking user from notifications', error);
          });
        }
        
        // Important: Log the final state to help with debugging
        setTimeout(() => {
          const currentState = get();
          authLogger.debug('Auth store state after update', {
            isInitialized: currentState.initialized,
            isAuthenticated: !!currentState.session,
            hasUser: !!currentState.user,
            userId: currentState.user?.id
          });
        }, 0);
      });
    },

    initialize: async () => {
      try {
        authLogger.debug('Initializing auth store');
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          authLogger.error('Error getting session', { error: error.message });
          throw error;
        }

        authLogger.debug('Session retrieved', { 
          hasSession: !!data.session,
          user: data.session?.user ? {
            id: data.session.user.id,
            email: data.session.user.email,
            provider: data.session.user.app_metadata?.provider
          } : null
        });

        // If user is authenticated, ensure the garments bucket exists
        if (data.session?.user) {
          try {
            const { success, error } = await ensureGarmentsBucket();
            if (!success) {
              authLogger.warn('Failed to ensure garments bucket exists', { error });
            }
          } catch (bucketError) {
            authLogger.error('Error ensuring garments bucket', { error: bucketError });
          }
        }

        set((state) => {
          state.session = data.session;
          state.user = data.session?.user || null;
          state.initialized = true;
          state.isLoading = false;
        });
      } catch (error: any) {
        authLogger.error('Initialize error', { error: error.message });
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
          state.initialized = true;
        });
      }
    },

    signInWithGoogle: async () => {
      try {
        authLogger.debug('Starting Google sign-in');
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const redirectUrl = Constants.expoConfig?.extra?.authRedirectUrl || 'dripmax://auth/callback';
        authLogger.debug('Using redirect URL', { redirectUrl });

        // Start the OAuth flow with Supabase
        authLogger.debug('Calling Supabase signInWithOAuth');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          authLogger.error('Supabase OAuth error', { error: error.message });
          throw error;
        }
        
        authLogger.debug('Supabase OAuth response', { 
          hasUrl: !!data?.url,
          url: data?.url ? data.url.substring(0, 100) + '...' : null // Log partial URL for privacy
        });
        
        if (data?.url) {
          // Open the URL in a web browser
          authLogger.debug('Opening auth session in WebBrowser');
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl
          ) as WebBrowserAuthSessionResult;
          
          authLogger.debug('WebBrowser auth session result', { 
            type: result.type,
            hasUrl: !!result.url
          });
          
          if (result.type === 'success' && result.url) {
            authLogger.debug('WebBrowser success with URL', { url: result.url.substring(0, 50) + '...' });
            
            try {
              // Parse the URL to extract the authorization code
              const url = new URL(result.url);
              const code = url.searchParams.get('code');
              
              if (code) {
                authLogger.debug('Found authorization code in URL', { code: code.substring(0, 10) + '...' });
                
                try {
                  // Exchange the code for a session
                  authLogger.debug('Exchanging code for session');
                  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
                  
                  if (sessionError) {
                    authLogger.error('Error exchanging code for session', { error: sessionError.message });
                    throw sessionError;
                  }
                  
                  authLogger.debug('Session exchange successful', { 
                    hasSession: !!sessionData.session,
                    user: sessionData.session?.user ? {
                      id: sessionData.session.user.id,
                      email: sessionData.session.user.email
                    } : null
                  });
                  
                  // Update the state with the new session
                  set((state) => {
                    state.session = sessionData.session;
                    state.user = sessionData.session?.user || null;
                    state.isLoading = false;
                  });
                  
                  // Track the sign in event
                  try {
                    trackEvent(ANALYTICS_EVENTS.USER_SIGNED_IN, {
                      method: 'google'
                    });
                  } catch (analyticsError) {
                    authLogger.error('Error tracking sign in event', { error: analyticsError });
                  }
                  
                  return;
                } catch (exchangeError: any) {
                  authLogger.error('Error during code exchange', { error: exchangeError.message, stack: exchangeError.stack });
                  // Continue to check for session
                }
              }
            } catch (urlParseError: any) {
              authLogger.error('Error parsing URL', { error: urlParseError.message, stack: urlParseError.stack });
              // Continue to check for session
            }
          }
          
          // If we get here, we didn't successfully exchange the code for a session
          // Let's check if we have a session anyway (the auth state listener might have handled it)
          try {
            authLogger.debug('Checking for session after WebBrowser');
            const { data: sessionData } = await supabase.auth.getSession();
            
            authLogger.debug('Session after WebBrowser', { 
              hasSession: !!sessionData.session,
              user: sessionData.session?.user ? {
                id: sessionData.session.user.id,
                email: sessionData.session.user.email
              } : null
            });
            
            // Update the state with the session (if any)
            set((state) => {
              state.session = sessionData.session;
              state.user = sessionData.session?.user || null;
              state.isLoading = false;
            });
          } catch (sessionError: any) {
            authLogger.error('Error getting session', { error: sessionError.message, stack: sessionError.stack });
            set((state) => {
              state.isLoading = false;
            });
          }
        } else {
          authLogger.debug('No URL returned from Supabase OAuth');
          set((state) => {
            state.isLoading = false;
          });
        }
      } catch (error: any) {
        authLogger.error('Sign in with Google error', { error: error.message, stack: error.stack });
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    signInWithApple: async () => {
      try {
        authLogger.debug('Starting Apple sign-in');
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        // Check if native Apple authentication is available
        const isNativeAppleAuthAvailable = await isAppleAuthAvailable();

        if (!isNativeAppleAuthAvailable) {
          throw new Error('Apple authentication is not available on this device');
        }

        // Request Apple authentication
        authLogger.debug('Using native Apple authentication');
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        
        // Format user data for logging only - not needed for Supabase auth
        const userData = formatAppleUserData(credential);
        authLogger.debug('Apple authentication successful', { 
          identityToken: credential.identityToken ? 'present' : 'missing',
          user: userData
        });
        
        if (!credential.identityToken) {
          throw new Error('No identity token received from Apple');
        }

        // Sign in with Supabase using the Apple identity token
        authLogger.debug('Signing in to Supabase with Apple identity token');
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        
        if (sessionError) {
          authLogger.error('Error signing in with Apple identity token', { error: sessionError.message });
          throw sessionError;
        }
        
        authLogger.debug('Supabase sign-in with Apple successful', { 
          hasSession: !!sessionData.session,
          user: sessionData.session?.user ? {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email
          } : null
        });
        
        // Update the state with the new session
        set((state) => {
          state.session = sessionData.session;
          state.user = sessionData.session?.user || null;
          state.isLoading = false;
        });

        // Track the sign in event
        try {
          trackEvent(ANALYTICS_EVENTS.USER_SIGNED_IN, {
            method: 'apple'
          });
        } catch (analyticsError) {
          authLogger.error('Error tracking sign in event', { error: analyticsError });
        }
      } catch (error: any) {
        // If the user cancels the Apple sign-in, don't treat it as an error
        if (error.code === 'ERR_CANCELED') {
          authLogger.debug('User canceled Apple sign-in');
          set((state) => {
            state.isLoading = false;
          });
          return;
        }
        
        // For device compatibility issues, provide a clearer message
        if (error.message?.includes('not available')) {
          authLogger.error('Device compatibility error', { error: error.message });
          set((state) => {
            state.error = 'Apple Sign-In is not available on this device';
            state.isLoading = false;
          });
          return;
        }
        
        // Handle all other errors
        authLogger.error('Sign in with Apple error', { 
          error: error.message,
          code: error.code
        });
        
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    signOut: async () => {
      authLogger.info('Signing out user');
      set(state => { state.isLoading = true; state.error = null; });
      
      try {
        // Signal that we're starting a sign-out process
        // This will help the AuthTransitionManager to show the loading screen
        const currentIsLoading = useAuthStore.getState().isLoading;
        if (!currentIsLoading) {
          set(state => { state.isLoading = true; });
        }
        
        // Track the sign out event before resetting identity
        try {
          trackEvent(ANALYTICS_EVENTS.USER_SIGNED_OUT);
          resetAnalyticsUser();
        } catch (analyticsError) {
          authLogger.error('Error tracking sign out event', { error: analyticsError });
        }
        
        // Unlink user from OneSignal
        await unlinkUserFromNotifications();
        
        // Reset subscription store
        const resetSubscription = useSubscriptionStore.getState().resetUser;
        await resetSubscription();
        authLogger.debug('Subscription store reset');
        
        // Reset outfit store
        useOutfitStore.setState({
          outfits: [],
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastFetched: null
        });
        authLogger.debug('Outfit store reset');
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Force clean all auth tokens from secure store
        try {
          // Use the centralized helper to purge auth storage
          await purgeAuthStorage();
          authLogger.debug('Auth tokens cleaned');
        } catch (cleanupError) {
          // Don't fail the sign out process for token cleanup failures
          authLogger.error('Error cleaning up auth tokens', cleanupError);
        }
        
        // Add a small delay to ensure the transition manager has time to detect the sign-out
        await new Promise(resolve => setTimeout(resolve, 300));
        
        set(state => {
          state.isLoading = false;
          // We don't reset session or user here - the auth listener will handle that
        });
        
        authLogger.info('User signed out successfully');
      } catch (error: any) {
        authLogger.error('Error signing out user', error);
        set(state => {
          state.isLoading = false;
          state.error = error.message || 'Error signing out';
        });
      }
    },

    // Add a new function to force clean all auth tokens
    cleanAuthTokens: async () => {
      try {
        await purgeAuthStorage();
        return true;
      } catch (error: any) {
        authLogger.error('Error force cleaning auth tokens', error);
        return false;
      }
    }
  }))
);

// Create a selector to get the setupAuthListener function
export const useSetupAuthListener = () => useAuthStore(state => state.setupAuthListener); 