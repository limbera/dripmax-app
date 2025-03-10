import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { supabaseLogger } from '../utils/logger';
import * as ImageManipulator from 'expo-image-manipulator';
import * as base64 from 'base64-js';

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
  // New AI analysis fields
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
  try {
    const { data: garments, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return { garments, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error fetching garments', { error: error.message });
    return { garments: null, error };
  }
};

/**
 * Upload a garment image and create a garment record
 * @param imageUri Local URI of the garment image
 * @returns The created garment and any error
 */
export const createGarment = async (imageUri: string) => {
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

    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `garment-${timestamp}.jpg`;
    supabaseLogger.debug('Generated file name', { fileName });

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
      throw compressionError;
    }

    // Read image as blob
    supabaseLogger.debug('Converting image to blob');
    let blob: Blob;
    let base64Data;
    try {
      const response = await fetch(compressedImage.uri);
      blob = await response.blob();
      
      // Use FileReader to create base64 data - this approach is more reliable
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

    // Convert base64 to binary data for upload
    supabaseLogger.debug('Converting base64 to binary');
    const binaryData = base64.toByteArray(base64Data);
    
    // Upload the binary data to Supabase
    supabaseLogger.info('Uploading image to Supabase storage', {
      bucket: 'garments',
      fileSize: binaryData.length
    });
    
    // Try upload with retry logic
    let uploadAttempt = 0;
    const maxUploadAttempts = 3;
    let uploadResult = null;
    
    while (uploadAttempt < maxUploadAttempts) {
      uploadAttempt++;
      
      try {
        const { data, error } = await supabase.storage
          .from('garments')
          .upload(`${user.id}/${fileName}`, binaryData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          // Check if error contains HTML (indicating a server error)
          const errorString = String(error);
          if (errorString.includes('JSON Parse error') || errorString.includes('<')) {
            supabaseLogger.error(`Supabase upload attempt ${uploadAttempt} failed with HTML response`, { 
              error: errorString
            });
            
            if (uploadAttempt < maxUploadAttempts) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, uploadAttempt * 1000));
              continue;
            }
          }
          
          supabaseLogger.error('Supabase upload error', { error: error.message });
          throw error;
        }
        
        uploadResult = data;
        break;
      } catch (uploadError: any) {
        supabaseLogger.error(`Upload attempt ${uploadAttempt} failed`, { 
          error: uploadError instanceof Error ? uploadError.message : String(uploadError)
        });
        
        if (uploadAttempt >= maxUploadAttempts) {
          throw uploadError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, uploadAttempt * 1000));
      }
    }
    
    if (!uploadResult || !uploadResult.path) {
      throw new Error('Upload succeeded but returned no path');
    }

    // Get the public URL
    supabaseLogger.debug('Getting public URL', { path: uploadResult.path });
    let publicUrl;
    try {
      const { data: { publicUrl: url } } = supabase.storage
        .from('garments')
        .getPublicUrl(uploadResult.path);
      
      publicUrl = url;
      supabaseLogger.debug('Public URL retrieved', { publicUrl });
    } catch (urlError: any) {
      supabaseLogger.error('Failed to get public URL', { 
        error: urlError.message, 
        stack: urlError.stack
      });
      throw urlError;
    }

    // Create the garment record
    supabaseLogger.info('Creating garment record in database', { 
      userId: user.id,
      publicUrlLength: publicUrl?.length
    });
    
    let garment;
    try {
      const { data, error: insertError } = await supabase
        .from('garments')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          category: 'uncategorized', // Default category
        })
        .select()
        .single();

      if (insertError) {
        supabaseLogger.error('Database insert failed', { 
          error: insertError.message,
          details: insertError.details,
          code: insertError.code,
          hint: insertError.hint
        });
        throw insertError;
      }
      
      garment = data;
      supabaseLogger.info('Garment created successfully', { garmentId: garment?.id });
    } catch (dbError: any) {
      supabaseLogger.error('Database error during insert', { 
        error: dbError.message, 
        stack: dbError.stack,
        code: dbError?.code,
        hint: dbError?.hint
      });
      throw dbError;
    }

    return { garment, error: null };
  } catch (error: any) {
    supabaseLogger.error('Error creating garment - top level catch', { 
      error: error.message,
      stack: error.stack, 
      name: error.name,
      code: error?.code
    });
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

/**
 * Analyze and create a garment using the Supabase Edge Function
 * @param imageUri Local URI of the garment image
 * @returns The created garment and any error
 */
export const analyzeAndCreateGarment = async (imageUri: string) => {
  supabaseLogger.info('Starting garment analysis and creation', { imageUriLength: imageUri?.length });
  
  try {
    // First get the current user
    supabaseLogger.debug('Fetching current user');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      supabaseLogger.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    supabaseLogger.info('User authenticated', { userId: user.id });

    // Compress the image before processing
    supabaseLogger.debug('Compressing image', { imageUriStart: imageUri.substring(0, 30) });
    let compressedImage;
    try {
      compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1000 } }], // Resize to max width of 1000px to reduce size
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true } // 60% quality JPEG with base64
      );
      
      supabaseLogger.debug('Image compressed successfully', {
        originalUri: imageUri.substring(0, 30) + '...',
        compressedUri: compressedImage.uri.substring(0, 30) + '...',
        width: compressedImage.width,
        height: compressedImage.height,
        base64Length: compressedImage.base64?.length
      });
    } catch (compressionError: any) {
      supabaseLogger.error('Failed to compress image', { 
        error: compressionError.message, 
        stack: compressionError.stack
      });
      throw compressionError;
    }

    if (!compressedImage.base64) {
      supabaseLogger.error('Failed to get base64 data from compressed image');
      throw new Error('Failed to get base64 data from compressed image');
    }
    
    // Call the Edge Function
    supabaseLogger.info('Calling analyze-garment Edge Function');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-garment', {
        body: { 
          image: compressedImage.base64,
          userId: user.id
        }
      });
      
      if (error) {
        supabaseLogger.error('Edge function error', { 
          error: error.message,
          name: error.name,
          code: error?.code,
          details: JSON.stringify(error) 
        });
        throw error;
      }
      
      if (!data || !data.garment) {
        supabaseLogger.error('Edge function returned no garment data', { response: JSON.stringify(data) });
        throw new Error('Edge function returned no garment data');
      }
      
      supabaseLogger.info('Garment created successfully via Edge Function', { 
        garmentId: data.garment.id 
      });
      
      return { garment: data.garment, error: null };
    } catch (functionError: any) {
      supabaseLogger.error('Function invocation error', { 
        message: functionError.message,
        name: functionError.name,
        code: functionError?.code,
        status: functionError?.status,
        details: JSON.stringify(functionError)
      });
      
      // Check for payload size issues
      if (compressedImage.base64 && compressedImage.base64.length > 1000000) {
        supabaseLogger.error('Image payload may be too large', { 
          size: compressedImage.base64.length 
        });
        throw new Error('Image file is too large. Please try again with a smaller image.');
      }
      
      throw functionError;
    }
  } catch (error: any) {
    supabaseLogger.error('Error analyzing and creating garment', { 
      error: error.message,
      stack: error.stack, 
      name: error.name,
      code: error?.code
    });
    return { garment: null, error };
  }
}; 