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
   * Initialize OneSignal for push notifications (without prompting)
   */
  initializeBase = async (): Promise<void> => {
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
      
      // Set up notification handlers
      this.setupNotificationHandlers();

      console.log('OneSignal base initialized successfully (without prompting for permission)');
      
      // Log subscription state to help diagnose issues (can be kept or removed if too verbose)
      setTimeout(async () => {
        try {
          const nativePermissionValue = await OneSignal.Notifications.permissionNative;
          console.log('OneSignal permission state (native evaluated) post base init:', nativePermissionValue);
          
          const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
          const isOptedInAsyncValue = await OneSignal.User.pushSubscription.getOptedInAsync();
          console.log('OneSignal Push Subscription ID post base init:', subscriptionId);
          console.log('OneSignal User Opted In (from getOptedInAsync) post base init:', isOptedInAsyncValue);
        } catch (error) {
          console.error('Error checking OneSignal state post base init:', error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error in OneSignal base initialization:', error);
    }
  };

  /**
   * Prompts the user for push notification permissions and subscribes them if granted.
   * This should be called at an appropriate time in the UX.
   */
  promptAndSubscribeUser = async (): Promise<boolean> => {
    console.log('Attempting to prompt and subscribe user for notifications...');
    try {
      const permissionGranted = await this.promptForPushNotificationsWithUserResponse();
      console.log('Result of promptForPushNotificationsWithUserResponse in promptAndSubscribeUser:', permissionGranted);

      if (permissionGranted) {
        console.log('Permission granted, calling setSubscription(true) in promptAndSubscribeUser');
        this.setSubscription(true); // This calls optIn and requestPermission
        // Optional: check opt-in status after a short delay
        setTimeout(async () => {
          try {
            const isOptedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
            console.log('OneSignal User Opted In status after promptAndSubscribeUser:', isOptedIn);
          } catch (e) {
            console.error('Error checking opt-in status in promptAndSubscribeUser:', e);
          }
        }, 1500);
      } else {
        console.log('Permission not granted in promptAndSubscribeUser.');
      }
      return permissionGranted;
    } catch (error) {
      console.error('Error in promptAndSubscribeUser:', error);
      return false;
    }
  };

  /**
   * DEPRECATED - Use initializeBase() for setup and promptAndSubscribeUser() for prompting.
   * Initialize OneSignal for push notifications
   */
  initialize = async (): Promise<void> => {
    console.warn("NotificationService.initialize() is deprecated. Use initializeBase() and promptAndSubscribeUser() separately.");
    // For safety, let's have it call the new base initialization for now if accidentally called.
    await this.initializeBase();
    // DO NOT prompt here anymore.
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
          // For iOS, after expo-notifications grants permission,
          // tell OneSignal to register. The true param means fallback to settings if initially denied.
          await OneSignal.Notifications.requestPermission(true);

          // It's good practice to ensure OneSignal knows about the permission.
          // Logging state after a short delay can be helpful for debugging.
          setTimeout(async () => {
            try {
              const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
              const nativePermValue = await OneSignal.Notifications.permissionNative;
              console.log('OneSignal status immediately after iOS requestPermission: OptedInAsync:', optedIn, 'NativePermission:', nativePermValue);
            } catch (e) {
              console.error('Error logging status post iOS requestPermission:', e);
            }
          }, 1500);

          return true;
        }
        
        console.log('iOS permission not granted:', status);
        return isGranted; // This will be false if not granted
      }
      
      // Android
      console.log('Requesting Android OneSignal permission');
      // This will show the native Android prompt if permissions are not yet determined.
      // The `true` argument means if the user previously denied, it can take them to app settings.
      await OneSignal.Notifications.requestPermission(true); 
      
      // Add a small delay to allow the native permission dialog to process and system state to update.
      // This can sometimes be necessary before checking permissionNative.
      await new Promise(resolve => setTimeout(resolve, 500));

      const androidPermissionGranted = await OneSignal.Notifications.permissionNative;
      console.log('Android OneSignal native permission status after request:', androidPermissionGranted);

      // Log current opt-in status for debugging after a delay
      setTimeout(async () => {
        try {
          const isOptedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
          console.log('OneSignal status after Android requestPermission: OptedInAsync:', isOptedIn, 'NativePermission:', androidPermissionGranted);
        } catch (e) {
          console.error('Error logging status post Android requestPermission:', e);
        }
      }, 1500);

      return androidPermissionGranted; // Return the actual permission state from OneSignal
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