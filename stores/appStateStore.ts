import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as SplashScreen from 'expo-splash-screen';
import { authLogger } from '../utils/logger';

// Define the application states
export enum AppState {
  INITIALIZING = 'INITIALIZING',         // App is starting up
  LOADING_FONTS = 'LOADING_FONTS',       // Loading necessary fonts
  CHECKING_AUTH = 'CHECKING_AUTH',       // Verifying authentication status
  CHECKING_SUBSCRIPTION = 'CHECKING_SUBSCRIPTION', // Verifying subscription status
  INITIALIZING_NOTIFICATIONS = 'INITIALIZING_NOTIFICATIONS', // Setting up notifications
  UNAUTHENTICATED = 'UNAUTHENTICATED',   // User is not logged in
  AUTHENTICATED_NO_SUB = 'AUTHENTICATED_NO_SUB', // User is logged in without subscription 
  AUTHENTICATED_WITH_SUB = 'AUTHENTICATED_WITH_SUB', // User is logged in with subscription
  ERROR = 'ERROR'                        // Something went wrong
}

// App state interface
interface AppStateStore {
  // Current app state
  currentState: AppState;
  // States that have been completed
  completedStates: AppState[];
  // Overall loading progress (0-100)
  loadingProgress: number;
  // Optional error message
  error: string | null;
  // Whether the splash screen has been hidden
  splashScreenHidden: boolean;
  // Force refresh flag - use to trigger rerenders
  forceRefreshCounter: number;
  
  // Readiness flags for initialization steps
  authServiceReady: boolean;
  subscriptionServiceReady: boolean;
  notificationsReady: boolean;
  
  // Actions
  setAppState: (state: AppState) => void;
  markStateComplete: (state: AppState) => void;
  setError: (message: string) => void;
  hideSplashScreen: () => Promise<void>;
  forceRefresh: () => void;
  setAuthServiceReady: (isReady: boolean) => void;
  setSubscriptionServiceReady: (isReady: boolean) => void;
  setNotificationsReady: (isReady: boolean) => void;
  
  // Selectors
  isInitialized: () => boolean;
  getTargetRoute: () => string;
  isStateComplete: (state: AppState) => boolean;
}

// Constants for state ordering and weights
const STATE_WEIGHTS = {
  [AppState.INITIALIZING]: 10,
  [AppState.LOADING_FONTS]: 10,
  [AppState.CHECKING_AUTH]: 25,
  [AppState.CHECKING_SUBSCRIPTION]: 25,
  [AppState.INITIALIZING_NOTIFICATIONS]: 10,
  [AppState.UNAUTHENTICATED]: 0,
  [AppState.AUTHENTICATED_NO_SUB]: 0,
  [AppState.AUTHENTICATED_WITH_SUB]: 0,
  [AppState.ERROR]: 0,
};

// Create the app state store
export const useAppStateStore = create<AppStateStore>()(
  immer((set, get) => ({
    currentState: AppState.INITIALIZING,
    completedStates: [],
    loadingProgress: 0,
    error: null,
    splashScreenHidden: false,
    forceRefreshCounter: 0,
    authServiceReady: false,
    subscriptionServiceReady: false,
    notificationsReady: false,

    setAppState: (state: AppState) => {
      const previousState = get().currentState;
      authLogger.info(`Transitioning app state from ${previousState} to: ${state}`);
      
      set(store => {
        store.currentState = state;
        
        // Calculate progress based on completed states and weights
        const totalWeight = Object.values(STATE_WEIGHTS).reduce((a, b) => a + b, 0);
        const completedWeight = get().completedStates.reduce((sum, state) => 
          sum + (STATE_WEIGHTS[state] || 0), 0);
        
        store.loadingProgress = Math.min(
          Math.floor((completedWeight / totalWeight) * 100), 
          95 // Cap at 95% until fully initialized
        );
      });
    },

    markStateComplete: (state: AppState) => {
      authLogger.info(`Marking app state as complete: ${state}`);
      set(store => {
        if (!store.completedStates.includes(state)) {
          store.completedStates.push(state);
          
          // Recalculate progress
          const totalWeight = Object.values(STATE_WEIGHTS).reduce((a, b) => a + b, 0);
          const completedWeight = [...store.completedStates].reduce((sum, state) => 
            sum + (STATE_WEIGHTS[state] || 0), 0);
          
          store.loadingProgress = Math.min(
            Math.floor((completedWeight / totalWeight) * 100), 
            95 // Cap at 95% until fully initialized
          );
          
          // If this is the last initialization state, bump to 100%
          const initStates = [
            AppState.INITIALIZING,
            AppState.LOADING_FONTS,
            AppState.CHECKING_AUTH,
            AppState.CHECKING_SUBSCRIPTION,
            AppState.INITIALIZING_NOTIFICATIONS
          ];
          
          const allInitCompleted = initStates.every(s => 
            store.completedStates.includes(s) || s === state
          );
          
          if (allInitCompleted) {
            store.loadingProgress = 100;
          }
        }
      });
    },

    setError: (message: string) => {
      authLogger.error(`App state error: ${message}`);
      set(store => {
        store.error = message;
        store.currentState = AppState.ERROR;
      });
    },

    hideSplashScreen: async () => {
      if (!get().splashScreenHidden) {
        authLogger.info('Hiding splash screen');
        try {
          await SplashScreen.hideAsync();
          set(store => {
            store.splashScreenHidden = true;
          });
          authLogger.info('Splash screen hidden successfully');
        } catch (e) {
          authLogger.error('Error hiding splash screen', e);
          // Don't fail the app for this
          set(store => {
            store.splashScreenHidden = true;
          });
        }
      }
    },
    
    // Force a refresh of components listening to this store
    forceRefresh: () => {
      set(store => {
        store.forceRefreshCounter += 1;
      });
    },

    setAuthServiceReady: (isReady: boolean) => {
      authLogger.debug(`Setting authServiceReady: ${isReady}`);
      set(store => { store.authServiceReady = isReady; });
    },

    setSubscriptionServiceReady: (isReady: boolean) => {
      authLogger.debug(`Setting subscriptionServiceReady: ${isReady}`);
      set(store => { store.subscriptionServiceReady = isReady; });
    },

    setNotificationsReady: (isReady: boolean) => {
      authLogger.debug(`Setting notificationsReady: ${isReady}`);
      set(store => { store.notificationsReady = isReady; });
    },

    isInitialized: () => {
      const { currentState } = get();
      return (
        currentState === AppState.UNAUTHENTICATED ||
        currentState === AppState.AUTHENTICATED_NO_SUB ||
        currentState === AppState.AUTHENTICATED_WITH_SUB
      );
    },

    getTargetRoute: () => {
      const { currentState } = get();
      
      switch (currentState) {
        case AppState.UNAUTHENTICATED:
          return '/(auth)/login';
        case AppState.AUTHENTICATED_NO_SUB:
          return '/(onboarding)/capture';
        case AppState.AUTHENTICATED_WITH_SUB:
          return '/(protected)';
        case AppState.ERROR:
          // Route to the new error screen
          return '/(auth)/error';
        default:
          // Should never happen in normal operation
          return '/(auth)/login';
      }
    },

    isStateComplete: (state: AppState) => {
      return get().completedStates.includes(state);
    }
  }))
); 