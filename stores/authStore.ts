import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase, setupAuthStateListener } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { authLogger } from '../utils/logger';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleAuthAvailable, formatAppleUserData } from '../utils/appleAuth';

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
        
        set(state => {
          state.session = session;
          state.user = session?.user || null;
          state.isLoading = false;
          state.initialized = true;
        });
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

        // Get the redirect URL from environment variables or use a default
        const redirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'dripmax://auth/callback';
        authLogger.debug('Using redirect URL', { redirectUrl });

        // Start the OAuth flow with Supabase
        authLogger.debug('Calling Supabase signInWithOAuth');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
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

        // Use native Apple authentication if available
        if (isNativeAppleAuthAvailable) {
          authLogger.debug('Using native Apple authentication');
          
          try {
            // Request Apple authentication
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            
            const userData = formatAppleUserData(credential);
            authLogger.debug('Apple authentication successful', { 
              identityToken: credential.identityToken ? 'present' : 'missing',
              user: userData
            });
            
            if (credential.identityToken) {
              // Sign in with Supabase using the Apple identity token
              const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
                // Pass user data if needed
              });
              
              if (sessionError) {
                authLogger.error('Error signing in with Apple identity token', { error: sessionError.message });
                throw sessionError;
              }
              
              authLogger.debug('Supabase sign-in with Apple identity token successful', { 
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
              
              return;
            } else {
              throw new Error('No identity token received from Apple');
            }
          } catch (appleAuthError: any) {
            // If the user cancels the Apple sign-in, don't treat it as an error
            if (appleAuthError.code === 'ERR_CANCELED') {
              authLogger.debug('User canceled Apple sign-in');
              set((state) => {
                state.isLoading = false;
              });
              return;
            }
            
            // For other errors, log and fall back to web-based authentication
            authLogger.error('Error with native Apple authentication', { 
              error: appleAuthError.message,
              code: appleAuthError.code
            });
            
            // If there's a specific error that indicates we should fall back, log it
            authLogger.debug('Falling back to web-based Apple authentication');
          }
        } else {
          authLogger.debug('Native Apple authentication not available, using web-based authentication');
        }

        // Fall back to web-based authentication for non-iOS platforms or if native auth failed
        authLogger.debug('Using web-based Apple authentication');
        const redirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'dripmax://auth/callback';
        authLogger.debug('Using redirect URL', { redirectUrl });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          authLogger.error('Supabase OAuth error', { error: error.message });
          throw error;
        }
        
        if (data?.url) {
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
            
            // Parse the URL to extract the authorization code
            const url = new URL(result.url);
            const code = url.searchParams.get('code');
            
            if (code) {
              authLogger.debug('Found authorization code in URL', { code: code.substring(0, 10) + '...' });
              
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
              
              return;
            } else {
              // Check for a fragment in the URL
              const fragmentIndex = result.url.indexOf('#');
              
              if (fragmentIndex !== -1) {
                // Get the fragment part (everything after #)
                const fragment = result.url.substring(fragmentIndex + 1);
                authLogger.debug('Found fragment in URL', { fragment: fragment.substring(0, 30) + '...' });
                
                // Parse the fragment
                const params: Record<string, string> = {};
                fragment.split('&').forEach(pair => {
                  const [key, value] = pair.split('=');
                  if (key && value) {
                    params[key] = decodeURIComponent(value);
                  }
                });
                
                authLogger.debug('Parsed fragment parameters', { 
                  hasAccessToken: !!params.access_token,
                  hasRefreshToken: !!params.refresh_token
                });
                
                // If we have tokens in the fragment, set the session manually
                if (params.access_token && params.refresh_token) {
                  authLogger.debug('Found tokens in fragment, setting session manually');
                  
                  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: params.access_token,
                    refresh_token: params.refresh_token
                  });
                  
                  if (sessionError) {
                    authLogger.error('Error setting session', { error: sessionError.message });
                    throw sessionError;
                  }
                  
                  authLogger.debug('Session set successfully', { 
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
                  
                  return;
                }
              }
            }
          }
          
          // Check for a session after handling the URL
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
        } else {
          authLogger.debug('No URL returned from Supabase OAuth');
          set((state) => {
            state.isLoading = false;
          });
        }
      } catch (error: any) {
        authLogger.error('Sign in with Apple error', { error: error.message });
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    signOut: async () => {
      try {
        authLogger.debug('Signing out');
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const { error } = await supabase.auth.signOut();
        
        if (error) {
          authLogger.error('Sign out error', { error: error.message });
          throw error;
        }

        authLogger.debug('Sign out successful');
        // The auth state listener will handle updating the state
      } catch (error: any) {
        authLogger.error('Sign out error', { error: error.message });
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },
  }))
);

// Create a selector to get the setupAuthListener function
export const useSetupAuthListener = () => useAuthStore(state => state.setupAuthListener); 