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
  console.log('[NotificationUtils] Attempting to save preferences for userId:', userId, 'Preferences:', JSON.stringify(preferences));
  try {
    // Update the subscription status in OneSignal
    console.log('[NotificationUtils] Calling notificationService.setSubscription with enabled:', preferences.enabled);
    notificationService.setSubscription(preferences.enabled);
    console.log('[NotificationUtils] Called notificationService.setSubscription');
    
    const categoriesToSave = preferences.enabled 
      ? preferences.categories 
      : {
          [NotificationCategory.NEW_FEATURES]: false,
          [NotificationCategory.REMINDERS]: false,
          [NotificationCategory.MARKETING]: false,
          [NotificationCategory.ACCOUNT]: false,
        };

    console.log('[NotificationUtils] Calling notificationService.setTags with categories:', JSON.stringify(categoriesToSave));
    notificationService.setTags({
      new_features: categoriesToSave[NotificationCategory.NEW_FEATURES].toString(),
      reminders: categoriesToSave[NotificationCategory.REMINDERS].toString(),
      marketing: categoriesToSave[NotificationCategory.MARKETING].toString(),
      account: categoriesToSave[NotificationCategory.ACCOUNT].toString(),
    });
    console.log('[NotificationUtils] Called notificationService.setTags');
    
    // Store preferences in user profile using upsert
    console.log('[NotificationUtils] Attempting to upsert preferences to Supabase for userId:', userId);
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        { 
          id: userId, // Include the id for matching/inserting
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'id', // Specify the conflict column
          // Supabase versions <134 used `returning: 'representation'`
          // Supabase versions >=134 (JS client v2) use `select()` for returning data
          // Assuming JS client v2 or later, select() is chained after upsert
        }
      )
      .select(); // Ensure we get the upserted data back
      
    if (error) {
      console.error('[NotificationUtils] Error upserting notification preferences to Supabase:', error.message, 'Details:', error);
    } else {
      console.log('[NotificationUtils] Successfully upserted notification preferences to Supabase. Response:', JSON.stringify(data));
      if (data && data.length === 0) {
        console.warn('[NotificationUtils] Supabase upsert response was an empty array. This might indicate the RLS policy prevented the operation or the data being upserted was identical to existing data and no change was made.');
      }
    }
  } catch (error) {
    console.error('[NotificationUtils] Critical error in saveNotificationPreferences:', error);
  }
};

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  console.log('[NotificationUtils] Attempting to get preferences for userId:', userId);
  try {
    // Get preferences from user profile
    const { data, error, status } = await supabase
      .from('user_profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();
      
    if (error && status !== 406) { // 406 means no rows found, which is not necessarily an error here
      console.error('[NotificationUtils] Error getting notification preferences from Supabase:', error.message, 'Details:', error);
      console.log('[NotificationUtils] Returning DEFAULT_NOTIFICATION_PREFERENCES due to Supabase error.');
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    
    if (!data?.notification_preferences) {
      console.log('[NotificationUtils] No preferences found in Supabase for userId:', userId, 'or notification_preferences field is null. Returning DEFAULT_NOTIFICATION_PREFERENCES.');
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    
    console.log('[NotificationUtils] Successfully retrieved preferences from Supabase:', JSON.stringify(data.notification_preferences));
    return data.notification_preferences as NotificationPreferences;
  } catch (error) {
    console.error('[NotificationUtils] Critical error in getNotificationPreferences:', error);
    console.log('[NotificationUtils] Returning DEFAULT_NOTIFICATION_PREFERENCES due to critical error.');
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}; 