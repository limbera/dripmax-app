import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import * as Notifications from 'expo-notifications';

// Get the OneSignal App ID from environment variables
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId as string;

/**
 * NotificationService - Handles push notification setup and management
 */
class NotificationService {
  /**
   * Initialize OneSignal for push notifications
   */
  initialize = async (): Promise<void> => {
    try {
      // Only initialize if we have an app ID
      if (!ONESIGNAL_APP_ID) {
        console.error('OneSignal App ID is not defined in environment variables');
        return;
      }

      // Set up Expo notifications for iOS permission handling
      await this.setupExpoNotifications();

      // Set debug level (remove in production)
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      // Initialize OneSignal
      OneSignal.initialize(ONESIGNAL_APP_ID);
      
      // IMPORTANT: Request permission immediately to ensure device registration
      const permissionGranted = await this.promptForPushNotificationsWithUserResponse();
      console.log('Result of promptForPushNotificationsWithUserResponse:', permissionGranted);

      // Attempt to ensure subscription is active using the higher-level method
      if (permissionGranted) {
        console.log('Attempting to ensure subscription is active using setSubscription(true)');
        this.setSubscription(true); // This calls optIn and requestPermission
      }

      // Set up notification handlers
      this.setupNotificationHandlers();

      console.log('OneSignal initialized successfully');
      
      // Log subscription state to help diagnose issues
      setTimeout(async () => {
        try {
          // No longer need to explicitly call optIn() here as setSubscription(true) should handle it.

          let nativePermissionValue: boolean | string = 'unknown';
          const permissionGetter = OneSignal.Notifications.permissionNative;
          if (typeof permissionGetter === 'function') {
            try {
              nativePermissionValue = await (permissionGetter as () => Promise<boolean>)();
            } catch (e) {
              console.error('Error calling permissionNative as function:', e);
              nativePermissionValue = 'Error calling function';
            }
          } else {
            try {
              nativePermissionValue = await permissionGetter;
            } catch (e) {
              console.error('Error awaiting permissionNative:', e);
              nativePermissionValue = 'Error awaiting value';
            }
          }
          console.log('OneSignal permission state (native evaluated):', nativePermissionValue);
          
          const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
          // const isOptedIn = OneSignal.User.pushSubscription.optedIn; // Likely not reliable in v5
          let isOptedInAsyncValue: boolean | string = 'unknown';
          try {
            isOptedInAsyncValue = await OneSignal.User.pushSubscription.getOptedInAsync();
          } catch (e) {
            console.error('Error calling getOptedInAsync:', e);
            isOptedInAsyncValue = 'Error calling getOptedInAsync';
          }
          console.log('OneSignal Push Subscription ID:', subscriptionId);
          console.log('OneSignal User Opted In (from getOptedInAsync):', isOptedInAsyncValue);
          
          console.log('OneSignal pushSubscription object (direct):', OneSignal.User.pushSubscription);

        } catch (error) {
          console.error('Error checking OneSignal state:', error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  };

  /**
   * Set up Expo notifications for iOS permission handling
   */
  private setupExpoNotifications = async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      // Configure how notifications appear when the app is in the foreground
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  };

  /**
   * Set up handlers for notification events
   */
  private setupNotificationHandlers = (): void => {
    // Listen for notification clicks
    OneSignal.Notifications.addEventListener('click', (event: any) => {
      console.log('Notification clicked:', event);
      
      // Handle deep linking based on notification data
      if (event.notification.additionalData) {
        this.handleNotificationData(event.notification.additionalData);
      }
    });

    // Listen for foreground notifications
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      console.log('Notification received in foreground:', event);
      
      // In the latest OneSignal SDK v5, we don't call display() directly
      // Instead, we can choose whether to show the notification or not
      // by not preventing the default behavior
      
      // Inspect the event object to understand its structure
      console.log('Foreground notification event properties:', Object.keys(event));
      
      // Log the notification content for debugging
      if (event.notification) {
        console.log('Notification content:', event.notification);
      }
      
      // Allow the notification to display by default
      // Without calling any method - the notification should display by default
    });
    
    // Add manual permission check instead of using the event listener
    // since the TypeScript definitions don't include this event type
    setTimeout(async () => {
      try {
        let nativePermissionValue: boolean | string = 'unknown';
        const permissionGetter = OneSignal.Notifications.permissionNative;
        if (typeof permissionGetter === 'function') {
          try {
            nativePermissionValue = await (permissionGetter as () => Promise<boolean>)();
          } catch (e) {
            console.error('Error calling permissionNative as function during check:', e);
            nativePermissionValue = 'Error calling function';
          }
        } else {
          try {
            nativePermissionValue = await permissionGetter;
          } catch (e) {
            console.error('Error awaiting permissionNative during check:', e);
            nativePermissionValue = 'Error awaiting value';
          }
        }
        console.log('OneSignal permission state checked (native evaluated):', nativePermissionValue);
        
        // Also log general permission from Expo module for iOS
        if (Platform.OS === 'ios') {
          const expoPermission = await Notifications.getPermissionsAsync();
          console.log('Expo Notifications permission status (iOS):', expoPermission);
        }
      } catch (error) {
        console.error('Error checking OneSignal permission:', error);
      }
    }, 5000);
  };

  /**
   * Handle notification data for deep linking or other actions
   * 
   * @param data The additional data from the notification
   */
  private handleNotificationData = (data: any): void => {
    // Import router for navigation
    const { router } = require('expo-router');
    
    // Log the received data to help with debugging
    console.log('Handling notification data for deep linking:', data);
    
    // Handle specific screens based on the 'screen' property
    if (data.screen) {
      console.log('Deep linking to screen:', data.screen);
      
      switch (data.screen) {
        case 'camera':
          // Navigate to the camera screen
          router.push('/(protected)/camera');
          break;
        
        case 'outfit':
          // Navigate to a specific outfit if an ID is provided
          if (data.outfitId) {
            router.push(`/(protected)/outfit/${data.outfitId}`);
          } else {
            // Fallback to all outfits if no specific ID
            router.push('/(protected)/outfit');
          }
          break;
          
        case 'profile':
          // Navigate to user profile
          router.push('/(protected)/profile');
          break;
          
        default:
          // Default to home screen if screen is unknown
          console.warn('Unknown screen for deep linking:', data.screen);
          router.push('/(protected)');
      }
    } else {
      // If no specific screen is defined, navigate to home
      console.log('No screen specified in notification, navigating to home');
      router.push('/(protected)');
    }
  };

  /**
   * Request notification permissions
   * This will show the iOS permission dialog
   */
  promptForPushNotificationsWithUserResponse = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await Notifications.requestPermissionsAsync();
        const isGranted = status === Notifications.PermissionStatus.GRANTED;
        
        if (isGranted) {
          console.log('Requesting OneSignal permission (iOS)');
          OneSignal.Notifications.requestPermission(true);

          setTimeout(async () => {
            try {
              const optedIn = OneSignal.User.pushSubscription.optedIn;
              let nativePermValue: boolean | string = 'unknown';
              const permGetter = OneSignal.Notifications.permissionNative;
              if (typeof permGetter === 'function') nativePermValue = await (permGetter as () => Promise<boolean>)(); 
              else nativePermValue = await permGetter;
              console.log('OneSignal status immediately after iOS requestPermission: OptedIn:', optedIn, 'NativePermission:', nativePermValue);
            } catch (e) {
              console.error('Error logging status post iOS requestPermission:', e);
            }
          }, 1500);

          return true;
        }
        
        console.log('iOS permission not granted:', status);
        return isGranted;
      }
      
      console.log('Requesting Android OneSignal permission');
      OneSignal.Notifications.requestPermission(true);
      setTimeout(async () => {
        try {
          const optedIn = OneSignal.User.pushSubscription.optedIn;
          let nativePermValue: boolean | string = 'unknown';
          const permGetter = OneSignal.Notifications.permissionNative;
          if (typeof permGetter === 'function') nativePermValue = await (permGetter as () => Promise<boolean>)(); 
          else nativePermValue = await permGetter;
          console.log('OneSignal status immediately after Android requestPermission: OptedIn:', optedIn, 'NativePermission:', nativePermValue);
        } catch (e) {
          console.error('Error logging status post Android requestPermission:', e);
        }
      }, 1500);
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  /**
   * Set external user ID for targeting notifications
   * Call this after user authentication
   */
  setExternalUserId = (userId: string): void => {
    try {
      console.log('Setting OneSignal external user ID:', userId);
      OneSignal.login(userId);
      
      // IMPORTANT: Request permission again after login
      // This ensures the device is properly registered with the user ID
      setTimeout(() => {
        OneSignal.Notifications.requestPermission(true);
      }, 1000);
    } catch (error) {
      console.error('Error setting external user ID:', error);
    }
  };

  /**
   * Remove external user ID
   * Call this after user logout
   */
  removeExternalUserId = (): void => {
    try {
      console.log('Removing OneSignal external user ID');
      OneSignal.logout();
    } catch (error) {
      console.error('Error removing external user ID:', error);
    }
  };

  /**
   * Set user tags for segmentation
   */
  setTags = (tags: Record<string, string>): void => {
    try {
      console.log('Setting OneSignal tags:', tags);
      for (const [key, value] of Object.entries(tags)) {
        OneSignal.User.addTag(key, value);
      }
    } catch (error) {
      console.error('Error setting tags:', error);
    }
  };

  /**
   * Get OneSignal device ID (player ID)
   * Useful for server-side operations
   */
  getDeviceId = async (): Promise<string | undefined> => {
    try {
      // Wait a moment to make sure OneSignal has initialized fully
      // This is a known issue where the ID might not be available immediately
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try different approaches to get the device ID
      
      // Approach 1: Use getIdAsync if available
      if (typeof OneSignal.User.pushSubscription.getIdAsync === 'function') {
        try {
          const id = await OneSignal.User.pushSubscription.getIdAsync();
          console.log('Retrieved device ID using getIdAsync:', id);
          return id || undefined;
        } catch (asyncError) {
          console.warn('Error with getIdAsync:', asyncError);
        }
      }
      
      // Approach 2: Try getPushSubscriptionId
      if (typeof OneSignal.User.pushSubscription.getPushSubscriptionId === 'function') {
        try {
          const id = OneSignal.User.pushSubscription.getPushSubscriptionId();
          console.log('Retrieved device ID using getPushSubscriptionId:', id);
          return id;
        } catch (syncError) {
          console.warn('Error with getPushSubscriptionId:', syncError);
        }
      }
      
      // Approach 3: Direct access to id property
      const pushSubscription = OneSignal.User.pushSubscription as any;
      if (pushSubscription.id) {
        const id = pushSubscription.id;
        console.log('Retrieved device ID from id property:', id);
        return id;
      }
      
      // Log available methods and properties for debugging
      console.log('PushSubscription available methods:', 
        Object.getOwnPropertyNames(pushSubscription)
          .filter(prop => typeof pushSubscription[prop] === 'function')
      );
      
      console.log('PushSubscription available properties:', 
        Object.getOwnPropertyNames(pushSubscription)
          .filter(prop => typeof pushSubscription[prop] !== 'function')
      );
      
      console.warn('Could not retrieve OneSignal device ID');
      return undefined;
    } catch (error) {
      console.error('Error getting OneSignal device ID:', error);
      return undefined;
    }
  };

  /**
   * Check if user has notification permissions
   */
  hasNotificationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await Notifications.getPermissionsAsync();
        const isGranted = status === Notifications.PermissionStatus.GRANTED;
        console.log('iOS notification permission:', isGranted);
        return isGranted;
      } else {
        // For Android, OneSignal handles permissions
        const permission = await OneSignal.Notifications.permissionNative;
        console.log('Android notification permission:', permission);
        return !!permission; // Convert to boolean
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  };

  /**
   * Opt in/out of notifications
   */
  setSubscription = (enabled: boolean): void => {
    try {
      console.log('Setting notification subscription:', enabled);
      if (enabled) {
        // Ensure permissions are requested if not already granted, then opt-in
        OneSignal.Notifications.requestPermission(true); // This is good for initial permission
        OneSignal.User.pushSubscription.optIn();
        console.log('OneSignal User opted in to push notifications');
      } else {
        // Opt-out the user from receiving push notifications
        OneSignal.User.pushSubscription.optOut();
        console.log('OneSignal User opted out of push notifications');
      }
    } catch (error) {
      console.error('Error setting subscription:', error);
    }
  };
}

// Create and export a singleton instance
export const notificationService = new NotificationService();
export default notificationService; 