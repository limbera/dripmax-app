import { MixpanelProperties } from 'mixpanel-react-native';
import { Platform } from 'react-native';

// Store the Mixpanel instance globally
let mixpanelInstance: any = null;

// Function to set the Mixpanel instance
export const setMixpanelInstance = (instance: any) => {
  mixpanelInstance = instance;
};

// Function to get the Mixpanel instance
export const getMixpanelInstanceCore = () => {
  return mixpanelInstance;
};

// Export analytics events - moved from services/mixpanel.ts
export const ANALYTICS_EVENTS = {
  USER_SIGNED_IN: 'User Signed In',
  USER_SIGNED_OUT: 'User Signed Out',
  SCREEN_VIEWED: 'Screen Viewed',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  SCAN_STARTED: 'Scan Started',
  PHOTO_TAKEN: 'Photo Taken',
  PHOTO_PREVIEW: 'Photo Preview',
  ANALYSIS_STARTED: 'Analysis Started',
  ANALYSIS_COMPLETED: 'Analysis Completed',
  OUTFIT_ADDED: 'Outfit Added',
  OUTFIT_VIEWED: 'Outfit Viewed',
  OUTFIT_DELETED: 'Outfit Deleted',
  OUTFIT_SHARED: 'Outfit Shared',
  OUTFIT_SAVED: 'Outfit Saved',
};

// Helper function to track app events
export const trackEventCore = (eventName: string, properties: MixpanelProperties = {}) => {
  try {
    if (!mixpanelInstance) return;

    // Add platform info to all events
    const eventProperties = {
      platform: Platform.OS,
      ...properties,
    };
    
    // Track the event
    mixpanelInstance.track(eventName, eventProperties);
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
  }
};

// Helper function to identify users in analytics
export const identifyUserCore = (userId: string, userProperties: MixpanelProperties = {}) => {
  try {
    if (!mixpanelInstance) return;
    
    // Identify the user
    mixpanelInstance.identify(userId);
    
    // Set user properties if provided
    if (Object.keys(userProperties).length > 0) {
      mixpanelInstance.getPeople().set(userProperties);
    }
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};

// Helper function to reset user in analytics
export const resetUserCore = () => {
  try {
    if (!mixpanelInstance) return;
    
    mixpanelInstance.reset();
  } catch (error) {
    console.error('Error resetting user:', error);
  }
}; 