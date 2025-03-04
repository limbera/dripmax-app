import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { supabaseLogger } from '../utils/logger';

// Get environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
const redirectUrl = Constants.expoConfig?.extra?.authRedirectUrl;

// Create a custom storage adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      supabaseLogger.error(`Error getting item from secure store: ${key}`, { error });
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      supabaseLogger.error(`Error setting item in secure store: ${key}`, { error });
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      supabaseLogger.error(`Error removing item from secure store: ${key}`, { error });
    }
  }
};

// Get the initial URL for deep linking
const getInitialURL = async () => {
  return await Linking.getInitialURL();
};

// Create the Supabase client
supabaseLogger.info('Creating Supabase client');
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-App-Name': 'Dripmax',
    },
  },
});
supabaseLogger.info('Supabase client created');

// Set up URL event listener for deep linking
Linking.addEventListener('url', async ({ url }) => {
  if (url) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      supabaseLogger.error('Error getting session after URL event', { error: error.message });
    }
  }
});

// Export a function to set up the auth state listener
export const setupAuthStateListener = (callback: (session: any) => void) => {
  supabaseLogger.info('Setting up auth state listener');
  
  // Set up the auth state change listener
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      supabaseLogger.info(`Auth state changed: ${event}`, {
        hasSession: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        } : null
      });
      
      // Call the callback with the new session
      callback(session);
    }
  );
  
  // Return the unsubscribe function for cleanup
  return () => {
    supabaseLogger.info('Cleaning up auth state listener');
    subscription.unsubscribe();
  };
};

/**
 * Transform an image URL using Supabase Storage Image Transformations
 * @param url The original image URL from Supabase Storage
 * @param width The desired width
 * @param height The desired height
 * @param quality Optional quality parameter (1-100)
 * @returns The transformed image URL
 */
export const getTransformedImageUrl = (
  url: string, 
  width: number, 
  height: number,
  quality: number = 80
): string => {
  if (!url) return '';
  
  // Check if it's a Supabase storage URL
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url; // Return original if not a Supabase URL
  }
  
  // Extract bucket and path from the URL
  // Format: https://{PROJECT_REF}.supabase.co/storage/v1/object/public/{BUCKET}/{PATH}
  const urlParts = url.split('/public/');
  if (urlParts.length !== 2) return url; // Return original if URL format is unexpected
  
  const bucket = urlParts[1].split('/')[0];
  const path = urlParts[1].substring(bucket.length + 1);
  
  // Get transformed URL
  return supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width,
        height,
        quality,
      },
    }).data.publicUrl;
}; 