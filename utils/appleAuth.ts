import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { authLogger } from './logger';

/**
 * Check if Apple authentication is available on the device
 * 
 * This checks if:
 * 1. The device is running iOS
 * 2. Apple authentication is available on the device
 * 
 * @returns A promise that resolves to a boolean indicating if Apple authentication is available
 */
export const isAppleAuthAvailable = async (): Promise<boolean> => {
  // Only available on iOS
  if (Platform.OS !== 'ios') {
    authLogger.debug('Apple authentication not available: not iOS');
    return false;
  }
  
  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    authLogger.debug(`Apple authentication ${isAvailable ? 'is' : 'is not'} available on this device`);
    return isAvailable;
  } catch (error) {
    authLogger.error('Error checking Apple authentication availability', { error });
    return false;
  }
};

/**
 * Format user data from Apple authentication
 * 
 * @param credential The credential from Apple authentication
 * @returns Formatted user data
 */
export const formatAppleUserData = (credential: AppleAuthentication.AppleAuthenticationCredential) => {
  return {
    id: credential.user,
    email: credential.email,
    fullName: credential.fullName ? 
      `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
      undefined,
  };
}; 