import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { supabaseLogger } from '../utils/logger';
import * as ImageManipulator from 'expo-image-manipulator';
import * as base64 from 'base64-js';
import { captureException, startTransaction, SeverityLevel, addBreadcrumb } from '../services/sentry';

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
      captureException(error as Error, { context: 'SecureStore', key });
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      supabaseLogger.error(`Error setting item in secure store: ${key}`, { error });
      captureException(error as Error, { context: 'SecureStore', key });
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      supabaseLogger.error(`Error removing item from secure store: ${key}`, { error });
      captureException(error as Error, { context: 'SecureStore', key });
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
      captureException(error, { url });
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
      
      // Add auth state change as a breadcrumb
      addBreadcrumb(
        'auth',
        `Auth state changed: ${event}`,
        event === 'SIGNED_OUT' ? SeverityLevel.Warning : SeverityLevel.Info,
        { hasSession: !!session }
      );
      
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
  
  // Log for debugging
  supabaseLogger.debug('Image transformation details', {
    bucket,
    path,
    originalUrl: url
  });
  
  // TEMPORARY FIX: Skip transformation for garments bucket
  if (bucket === 'garments') {
    supabaseLogger.debug('Skipping transformation for garments bucket');
    return url;
  }
  
  // Get transformed URL
  const transformedUrl = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width,
        height,
        quality,
      },
    }).data.publicUrl;
    
  supabaseLogger.debug('Transformed URL result', {
    transformedUrl
  });
  
  return transformedUrl;
};

// Garment type definition
export interface Garment {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  name: string | null;
  color: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  type: string | null;
  brand: string | null;
  primary_color: string | null;
  secondary_colors: string[] | null;
  pattern: string | null;
  material: string | null;
  size_range: string | null;
  fit_style: string | null;
  price_range: string | null;
}

/**
 * Fetch all garments for the current user
 * @returns Array of garments and any error
 */
export const fetchGarments = async () => {
  // Start a transaction for performance tracking
  const transaction = startTransaction('fetchGarments', 'db.query');
  
  try {
    addBreadcrumb('database', 'Fetching all garments', SeverityLevel.Info);
    
    const { data: garments, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    transaction.finish();
    return { garments, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error fetching garments', { error: error.message });
    captureException(error, { operation: 'fetchGarments' });
    transaction.finish();
    return { garments: null, error };
  }
};

/**
 * Upload a garment image and create a garment record
 * @param imageUri Local URI of the garment image
 * @returns The created garment and any error
 */
export const createGarment = async (imageUri: string) => {
  const transaction = startTransaction('createGarment', 'db.operation');
  supabaseLogger.info('Starting garment creation', { imageUriLength: imageUri?.length });
  
  try {
    // First get the current user
    supabaseLogger.debug('Fetching current user');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      supabaseLogger.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    supabaseLogger.info('User authenticated', { userId: user.id });

    // Compress the image before uploading to reduce size
    supabaseLogger.debug('Compressing image', { imageUriStart: imageUri.substring(0, 30) });
    let compressedImage;
    try {
      compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }], // Resize to max width of 1200px
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
      );
      
      supabaseLogger.debug('Image compressed successfully', {
        originalUri: imageUri.substring(0, 30) + '...',
        compressedUri: compressedImage.uri.substring(0, 30) + '...',
        width: compressedImage.width,
        height: compressedImage.height,
      });
    } catch (compressionError: any) {
      supabaseLogger.error('Failed to compress image', { 
        error: compressionError.message, 
        stack: compressionError.stack
      });
      captureException(compressionError, { 
        stage: 'image_compression',
        imageUriLength: imageUri?.length
      });
      throw compressionError;
    }

    // Read image as blob and convert to base64
    supabaseLogger.debug('Converting image to base64');
    let base64Data;
    try {
      const response = await fetch(compressedImage.uri);
      const blob = await response.blob();
      
      // Use FileReader to create base64 data
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          if (!reader.result) {
            reject(new Error('FileReader returned empty result'));
            return;
          }
          
          const base64String = reader.result as string;
          // Extract just the base64 data part (remove the data URI prefix)
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        
        reader.onerror = (error) => {
          supabaseLogger.error('FileReader error', { error });
          reject(new Error('Failed to read image data'));
        };
        
        reader.readAsDataURL(blob);
      });
      
      supabaseLogger.info('Image converted to base64 successfully', {
        dataLength: base64Data.length
      });
    } catch (conversionError: any) {
      supabaseLogger.error('Failed to convert image to base64', { 
        error: conversionError.message, 
        stack: conversionError.stack
      });
      throw conversionError;
    }

    // Call the analyze-garment Edge Function
    supabaseLogger.info('Calling analyze-garment Edge Function');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-garment', {
        body: {
          image: base64Data,
          userId: user.id
        }
      });
      
      if (error) {
        supabaseLogger.error('Edge Function error', { 
          error: error.message,
          status: error.status
        });
        throw new Error(`Edge Function error: ${error.message}`);
      }
      
      if (!data || !data.success || !data.garment) {
        supabaseLogger.error('Edge Function returned invalid response', { data });
        throw new Error('Failed to analyze and create garment');
      }
      
      supabaseLogger.info('Garment created successfully via Edge Function', { 
        garmentId: data.garment?.id 
      });
      
      return { garment: data.garment, error: null };
    } catch (edgeFunctionError: any) {
      supabaseLogger.error('Edge Function call failed', { 
        error: edgeFunctionError.message, 
        stack: edgeFunctionError.stack
      });
      throw edgeFunctionError;
    }
  } catch (error: any) {
    supabaseLogger.error('Error creating garment - top level catch', { 
      error: error.message,
      stack: error.stack, 
      name: error.name,
      code: error?.code
    });
    captureException(error, { 
      operation: 'createGarment',
      imageUriProvided: !!imageUri
    });
    transaction.finish();
    return { garment: null, error };
  }
};

/**
 * Delete a garment
 * @param garmentId ID of the garment to delete
 * @returns Success status and any error
 */
export const deleteGarment = async (garmentId: string) => {
  try {
    // Get the garment to find the image path
    const { data: garment, error: fetchError } = await supabase
      .from('garments')
      .select('image_url')
      .eq('id', garmentId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Delete the garment record
    const { error: deleteError } = await supabase
      .from('garments')
      .delete()
      .eq('id', garmentId);

    if (deleteError) {
      throw deleteError;
    }

    // Parse the image URL to get the path
    if (garment?.image_url) {
      const urlParts = garment.image_url.split('/public/');
      if (urlParts.length === 2) {
        const bucket = urlParts[1].split('/')[0];
        const path = urlParts[1].substring(bucket.length + 1);
        
        // Delete the image from storage
        await supabase.storage.from(bucket).remove([path]);
      }
    }

    return { success: true, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error deleting garment', { error: error.message });
    return { success: false, error };
  }
};

/**
 * Ensure the garments bucket exists in Supabase storage
 * This should be called during app initialization
 */
export const ensureGarmentsBucket = async () => {
  try {
    // Check if the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const garmentsBucketExists = buckets?.some(bucket => bucket.name === 'garments');
    
    // If bucket doesn't exist, create it
    if (!garmentsBucketExists) {
      supabaseLogger.info('Creating garments bucket');
      await supabase.storage.createBucket('garments', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error ensuring garments bucket exists', { error: error.message });
    return { success: false, error };
  }
};

/**
 * Fetch a specific garment by ID
 * @param garmentId ID of the garment to fetch
 * @returns The garment and any error
 */
export const fetchGarmentById = async (garmentId: string) => {
  try {
    supabaseLogger.debug('Fetching garment by ID', { garmentId });
    
    const { data: garment, error } = await supabase
      .from('garments')
      .select('*')
      .eq('id', garmentId)
      .single();
    
    if (error) {
      supabaseLogger.error('Error fetching garment by ID', { 
        error: error.message, 
        garmentId 
      });
      throw error;
    }
    
    supabaseLogger.debug('Garment fetched successfully', { 
      garmentId, 
      hasData: !!garment 
    });
    
    return { garment, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error in fetchGarmentById', { error: error.message });
    return { garment: null, error };
  }
}; 