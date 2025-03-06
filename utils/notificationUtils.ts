import { notificationService } from '../services/notifications';
import { supabase } from '../services/supabase';
import { Platform } from 'react-native';
import { OneSignal } from 'react-native-onesignal';

/**
 * Notification preference categories
 */
export enum NotificationCategory {
  NEW_FEATURES = 'new_features',
  REMINDERS = 'reminders',
  MARKETING = 'marketing',
  ACCOUNT = 'account',
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    [NotificationCategory.NEW_FEATURES]: boolean;
    [NotificationCategory.REMINDERS]: boolean;
    [NotificationCategory.MARKETING]: boolean;
    [NotificationCategory.ACCOUNT]: boolean;
  };
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    [NotificationCategory.NEW_FEATURES]: true,
    [NotificationCategory.REMINDERS]: true,
    [NotificationCategory.MARKETING]: false,
    [NotificationCategory.ACCOUNT]: true,
  },
};

/**
 * Link a user with OneSignal for targeted notifications
 * Call this after user authentication
 */
export const linkUserWithNotifications = async (userId: string): Promise<void> => {
  try {
    console.log('Linking user with OneSignal:', userId);
    
    // First, make sure we have permission
    // This is crucial - without permission, devices won't register with OneSignal
    const hasPermission = await notificationService.hasNotificationPermission();
    
    if (!hasPermission) {
      console.log('Requesting notification permission before linking user');
      await notificationService.promptForPushNotificationsWithUserResponse();
    }
    
    // Set the external user ID in OneSignal
    // This links the device to this user
    OneSignal.login(userId);
    console.log('User ID set in OneSignal');
    
    // Force a permission request again to ensure device registration
    // This is sometimes needed to fully register the device with OneSignal
    setTimeout(() => {
      console.log('Requesting permission after login to ensure registration');
      OneSignal.Notifications.requestPermission(true);
    }, 1000);
    
    // Log subscription state for debugging
    setTimeout(async () => {
      try {
        console.log('OneSignal push subscription state:', OneSignal.User.pushSubscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    }, 3000);
  } catch (error) {
    console.error('Error linking user with notifications:', error);
  }
};

/**
 * Unlink a user from OneSignal
 * Call this after user logout
 */
export const unlinkUserFromNotifications = async (): Promise<void> => {
  try {
    // Remove the external user ID from OneSignal
    notificationService.removeExternalUserId();
  } catch (error) {
    console.error('Error unlinking user from notifications:', error);
  }
};

/**
 * Save user notification preferences
 */
export const saveNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<void> => {
  try {
    // Update the subscription status in OneSignal
    notificationService.setSubscription(preferences.enabled);
    
    // Set tags for category preferences
    notificationService.setTags({
      new_features: preferences.categories[NotificationCategory.NEW_FEATURES].toString(),
      reminders: preferences.categories[NotificationCategory.REMINDERS].toString(),
      marketing: preferences.categories[NotificationCategory.MARKETING].toString(),
      account: preferences.categories[NotificationCategory.ACCOUNT].toString(),
    });
    
    // Store preferences in user profile
    const { error } = await supabase
      .from('user_profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error saving notification preferences:', error);
    }
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
};

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  try {
    // Get preferences from user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();
      
    if (error || !data?.notification_preferences) {
      // Return default preferences if not found
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    
    return data.notification_preferences as NotificationPreferences;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}; 