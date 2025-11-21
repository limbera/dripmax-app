import * as SecureStore from 'expo-secure-store';

import { authLogger } from '../utils/logger';

const HAS_LOGGED_IN_BEFORE_KEY = 'dripmax-has-logged-in-before';
const CAMERA_INTERSTITIAL_KEY = 'dripmax-camera-permission-interstitial';

export async function markUserAsReturning() {
  try {
    await SecureStore.setItemAsync(HAS_LOGGED_IN_BEFORE_KEY, 'true');
    authLogger.debug('Marked user as returning');
  } catch (error) {
    authLogger.warn('Failed to mark user as returning', error);
  }
}

export async function hasUserLoggedInBefore(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(HAS_LOGGED_IN_BEFORE_KEY);
    return value === 'true';
  } catch (error) {
    authLogger.warn('Failed to read returning-user flag', error);
    return false;
  }
}

export async function hasSeenCameraPermissionInterstitial(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(CAMERA_INTERSTITIAL_KEY);
    return value === 'true';
  } catch (error) {
    authLogger.warn('Failed to read camera interstitial flag', error);
    return false;
  }
}

export async function markCameraPermissionInterstitialSeen() {
  try {
    await SecureStore.setItemAsync(CAMERA_INTERSTITIAL_KEY, 'true');
    authLogger.debug('Marked camera interstitial as seen');
  } catch (error) {
    authLogger.warn('Failed to mark camera interstitial as seen', error);
  }
}

