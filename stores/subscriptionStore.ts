import { Platform } from 'react-native';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import Purchases, { 
  PurchasesPackage, 
  CustomerInfo, 
  LOG_LEVEL, 
  PurchasesOffering 
} from 'react-native-purchases';
import { authLogger } from '../utils/logger';
import Constants from 'expo-constants';

// Create a logger specifically for subscription-related logs
const subscriptionLogger = {
  debug: (message: string, data?: any) => authLogger.debug(`[Subscription] ${message}`, data),
  info: (message: string, data?: any) => authLogger.info(`[Subscription] ${message}`, data),
  error: (message: string, data?: any) => authLogger.error(`[Subscription] ${message}`, data),
};

// Define the subscription state interface
interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  hasActiveSubscription: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  identifyUser: (userId: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  checkEntitlementStatus: () => Promise<boolean>;
  hasEntitlementAccess: (entitlementId: string) => boolean;
  resetUser: () => Promise<void>;
  // New method for ensuring subscription status is checked during initialization
  ensureSubscriptionStatusChecked: () => Promise<boolean>;
}

const REVENUECAT_API_KEYS = {
  ios: Constants.expoConfig?.extra?.revenuecatAppleApiKey,
  android: Constants.expoConfig?.extra?.revenuecatGoogleApiKey,
};

// Entitlement and offering identifiers
export const ENTITLEMENTS = {
  ALL_ACCESS: 'all_access',
};

export const OFFERINGS = {
  DEFAULT: 'default',
};

export const useSubscriptionStore = create<SubscriptionState>()(
  immer((set, get) => ({
    isInitialized: false,
    isLoading: false,
    customerInfo: null,
    currentOffering: null,
    hasActiveSubscription: false,
    error: null,

    initialize: async () => {
      const initStart = Date.now();
      subscriptionLogger.info(`Initialize Start (${initStart})`);
      
      try {
        subscriptionLogger.info('Initializing RevenueCat');
        
        set(state => {
          state.isLoading = true;
          state.error = null;
        });

        // Set the log level for development
        if (__DEV__) {
          subscriptionLogger.debug('Setting RevenueCat LogLevel to DEBUG');
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        } else {
          Purchases.setLogLevel(LOG_LEVEL.ERROR);
        }

        // Configure RevenueCat with the appropriate API key
        subscriptionLogger.debug('Configure Start');
        const configureStart = Date.now();
        if (Platform.OS === 'ios') {
          subscriptionLogger.debug('Configuring RevenueCat for iOS');
          Purchases.configure({ apiKey: REVENUECAT_API_KEYS.ios });
        } else if (Platform.OS === 'android') {
          subscriptionLogger.debug('Configuring RevenueCat for Android');
          Purchases.configure({ apiKey: REVENUECAT_API_KEYS.android });
        }
        subscriptionLogger.debug(`Configure End (${Date.now() - configureStart}ms)`);

        // Fetch initial offerings
        subscriptionLogger.debug('Fetch Offerings Start');
        const fetchStart = Date.now();
        await get().fetchOfferings();
        subscriptionLogger.debug(`Fetch Offerings End (${Date.now() - fetchStart}ms)`);

        // Check the initial entitlement status
        subscriptionLogger.debug('Check Entitlements Start');
        const checkStart = Date.now();
        await get().checkEntitlementStatus();
        subscriptionLogger.debug(`Check Entitlements End (${Date.now() - checkStart}ms)`);

        set(state => {
          state.isInitialized = true;
          state.isLoading = false;
        });

        subscriptionLogger.info(`RevenueCat Initialization Complete (${Date.now() - initStart}ms total)`);
      } catch (error: any) {
        subscriptionLogger.error('Error initializing RevenueCat', { 
          error: error.message, 
          stack: error.stack 
        });
        
        set(state => {
          state.error = `Error initializing subscription service: ${error.message}`;
          state.isLoading = false;
        });
      }
    },

    identifyUser: async (userId: string) => {
      try {
        subscriptionLogger.info('Identifying user with RevenueCat', { userId });
        
        if (!userId) {
          throw new Error('No user ID provided for identification');
        }

        // Identify the user with RevenueCat
        const { customerInfo } = await Purchases.logIn(userId);
        
        subscriptionLogger.debug('User identified with RevenueCat', { 
          hasCustomerInfo: !!customerInfo,
        });

        set(state => {
          state.customerInfo = customerInfo;
        });

        // Check entitlement status after identifying user
        await get().checkEntitlementStatus();
        
        return;
      } catch (error: any) {
        subscriptionLogger.error('Error identifying user with RevenueCat', { 
          error: error.message, 
          stack: error.stack 
        });
        
        // Don't block app functionality due to RevenueCat issues
        // Set a fake customer info object to allow the app to continue
        if (error.message && (
            error.message.includes('configuration') || 
            error.message.includes('network') ||
            error.message.includes('offerings'))) {
          subscriptionLogger.debug('Setting placeholder customer info to allow app to continue');
          set(state => {
            state.error = `RevenueCat configuration issue: ${error.message}`;
            // Don't block app progression
            state.hasActiveSubscription = false;
          });
        } else {
          set(state => {
            state.error = `Error identifying user: ${error.message}`;
          });
        }
      }
    },

    fetchOfferings: async () => {
      const fetchStart = Date.now();
      subscriptionLogger.debug(`fetchOfferings Start (${fetchStart})`);
      try {
        subscriptionLogger.debug('Fetching RevenueCat offerings');
        
        set(state => {
          state.isLoading = true;
          state.error = null;
        });

        // Get offerings from RevenueCat
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current) {
          subscriptionLogger.debug('Successfully fetched RevenueCat offerings', {
            offeringId: offerings.current.identifier,
            packagesCount: offerings.current.availablePackages.length
          });
          
          set(state => {
            state.currentOffering = offerings.current;
            state.isLoading = false;
          });
        } else {
          subscriptionLogger.error('No offerings available from RevenueCat');
          
          set(state => {
            state.error = 'No subscription offerings available at this time';
            state.currentOffering = null;
            state.isLoading = false;
          });
        }
        subscriptionLogger.debug(`fetchOfferings End (${Date.now() - fetchStart}ms)`);
      } catch (error: any) {
        subscriptionLogger.error('Error fetching offerings', { 
          error: error.message, 
          stack: error.stack 
        });
        
        // Handle configuration errors gracefully
        if (error.message && (
            error.message.includes('configuration') || 
            error.message.includes('network') ||
            error.message.includes('offerings'))) {
          subscriptionLogger.debug('Setting placeholder offering to allow app to continue');
          set(state => {
            state.error = `RevenueCat configuration issue: ${error.message}`;
            state.currentOffering = null;
            state.isLoading = false;
            // App can still function without offerings
          });
        } else {
          set(state => {
            state.error = `Error fetching subscription options: ${error.message}`;
            state.isLoading = false;
          });
        }
      }
    },

    purchasePackage: async (pkg: PurchasesPackage) => {
      try {
        subscriptionLogger.info('Initiating package purchase', { 
          packageIdentifier: pkg.identifier 
        });
        
        set(state => {
          state.isLoading = true;
          state.error = null;
        });

        // Attempt to purchase the package
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        
        subscriptionLogger.debug('Purchase completed', { 
          hasCustomerInfo: !!customerInfo,
        });

        set(state => {
          state.customerInfo = customerInfo;
          state.isLoading = false;
        });

        // Check if the purchase granted the entitlement
        const hasAccess = await get().checkEntitlementStatus();
        
        return hasAccess;
      } catch (error: any) {
        // User cancellation is not an error
        if (error.userCancelled) {
          subscriptionLogger.debug('User cancelled purchase');
          
          set(state => {
            state.isLoading = false;
          });
          
          return false;
        }
        
        subscriptionLogger.error('Error making purchase', { 
          error: error.message, 
          stack: error.stack,
          code: error.code
        });
        
        set(state => {
          state.error = `Error making purchase: ${error.message}`;
          state.isLoading = false;
        });
        
        return false;
      }
    },

    restorePurchases: async () => {
      try {
        subscriptionLogger.info('Restoring purchases');
        
        set(state => {
          state.isLoading = true;
          state.error = null;
        });

        // Restore purchases
        const customerInfo = await Purchases.restorePurchases();
        
        subscriptionLogger.debug('Purchases restored', { 
          hasCustomerInfo: !!customerInfo,
        });

        set(state => {
          state.customerInfo = customerInfo;
          state.isLoading = false;
        });

        // Check entitlement status after restore
        await get().checkEntitlementStatus();
      } catch (error: any) {
        subscriptionLogger.error('Error restoring purchases', { 
          error: error.message, 
          stack: error.stack 
        });
        
        set(state => {
          state.error = `Error restoring purchases: ${error.message}`;
          state.isLoading = false;
        });
      }
    },

    checkEntitlementStatus: async () => {
      const checkStart = Date.now();
      subscriptionLogger.debug(`checkEntitlementStatus Start (${checkStart})`);
      try {
        subscriptionLogger.debug('Checking entitlement status');
        
        // Get the latest customer info
        const customerInfo = await Purchases.getCustomerInfo();
        
        // Check if the user has the "all_access" entitlement
        const hasActiveSubscription = 
          !!customerInfo.entitlements.active[ENTITLEMENTS.ALL_ACCESS];
        
        subscriptionLogger.debug('Entitlement status checked', { 
          hasActiveSubscription,
          activeEntitlements: Object.keys(customerInfo.entitlements.active)
        });

        set(state => {
          state.customerInfo = customerInfo;
          state.hasActiveSubscription = hasActiveSubscription;
        });
        
        subscriptionLogger.debug(`checkEntitlementStatus End (${Date.now() - checkStart}ms)`);
        return hasActiveSubscription;
      } catch (error: any) {
        subscriptionLogger.error('Error checking entitlement status', { 
          error: error.message, 
          stack: error.stack 
        });
        
        // Handle configuration errors gracefully
        if (error.message && (
            error.message.includes('configuration') || 
            error.message.includes('network') ||
            error.message.includes('offerings'))) {
          subscriptionLogger.debug('RevenueCat configuration issue, allowing app to continue');
          set(state => {
            state.error = `RevenueCat configuration issue: ${error.message}`;
            // Don't block app progression
            state.hasActiveSubscription = false;
          });
        } else {
          set(state => {
            state.error = `Error checking subscription status: ${error.message}`;
          });
        }
        
        return false;
      }
    },

    hasEntitlementAccess: (entitlementId: string) => {
      const { customerInfo } = get();
      
      if (!customerInfo) {
        subscriptionLogger.debug('Customer info not available, cannot check entitlement access');
        return false;
      }
      
      const hasAccess = !!customerInfo.entitlements.active[entitlementId];
      
      subscriptionLogger.debug(`Checking access for entitlement: ${entitlementId}`, { 
        hasAccess,
        activeEntitlements: Object.keys(customerInfo.entitlements.active || {})
      });
      
      return hasAccess;
    },

    resetUser: async () => {
      try {
        subscriptionLogger.info('Resetting RevenueCat user');
        
        // Check if there's an anonymous user already
        const currentInfo = await Purchases.getCustomerInfo();
        const isAnonymous = !currentInfo.originalAppUserId || 
                           currentInfo.originalAppUserId.startsWith('$RCAnonymousID:');
        
        if (isAnonymous) {
          subscriptionLogger.debug('Current user is already anonymous, skipping logout');
        } else {
          // Log out the current user
          await Purchases.logOut();
          subscriptionLogger.debug('User logged out from RevenueCat');
        }
        
        set(state => {
          state.customerInfo = null;
          state.hasActiveSubscription = false;
        });
        
        subscriptionLogger.debug('User reset complete');
      } catch (error: any) {
        // Handle common RevenueCat errors gracefully
        if (error.message && error.message.includes('current user is anonymous')) {
          subscriptionLogger.debug('Attempted to log out anonymous user, ignoring error');
          set(state => {
            state.customerInfo = null;
            state.hasActiveSubscription = false;
          });
        } else {
          subscriptionLogger.error('Error resetting user', { 
            error: error.message, 
            stack: error.stack 
          });
          
          set(state => {
            state.error = `Error resetting subscription user: ${error.message}`;
          });
        }
      }
    },

    // Add a new method that ensures subscription status is checked during app initialization
    ensureSubscriptionStatusChecked: async () => {
      try {
        subscriptionLogger.info('Ensuring subscription status is checked during initialization');
        
        // If not initialized yet, wait for it
        if (!get().isInitialized) {
          subscriptionLogger.debug('Waiting for subscription initialization before checking status');
          // Wait for initialization to complete, with a timeout
          let attempts = 0;
          const maxAttempts = 10; // Maximum attempts to check initialization
          
          while (!get().isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
            attempts++;
          }
          
          if (!get().isInitialized) {
            subscriptionLogger.error('Timed out waiting for subscription initialization');
            return false;
          }
        }
        
        // Check if we already have the status
        if (get().customerInfo) {
          const hasActiveSubscription = get().hasActiveSubscription;
          subscriptionLogger.debug('Already have subscription status', { hasActiveSubscription });
          return hasActiveSubscription;
        }
        
        // Otherwise, do a fresh check
        return await get().checkEntitlementStatus();
      } catch (error: any) {
        subscriptionLogger.error('Error ensuring subscription status check', { 
          error: error.message, 
          stack: error.stack 
        });
        return false;
      }
    },
  }))
); 