import { Mixpanel, MixpanelProperties } from 'mixpanel-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Initialize Mixpanel with your project token
// In production, you would use different tokens for different environments
const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || '';

// Create and configure Mixpanel instance
export const mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // Set debug flag as second parameter

// Set up Mixpanel with default options
export const initMixpanel = async () => {
  try {
    await mixpanel.init();
    
    // Set OS information as super properties
    mixpanel.registerSuperProperties({
      "$os": Platform.OS,
      "$os_version": Platform.Version,
      "app_version": Constants.expoConfig?.version || '',
      "app_build": Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '',
    });
    
    console.log('Mixpanel initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Mixpanel:', error);
    return false;
  }
};

// Helper function to track events
export const trackEvent = (
  eventName: string, 
  properties: MixpanelProperties = {}
) => {
  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
  }
};

// Helper function to identify users
export const identifyUser = (userId: string, userProperties: MixpanelProperties = {}) => {
  try {
    mixpanel.identify(userId);
    
    // Set user properties
    if (Object.keys(userProperties).length > 0) {
      mixpanel.getPeople().set(userProperties);
    }
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};

// Reset user identity (useful for sign-out)
export const resetUser = () => {
  try {
    mixpanel.reset();
  } catch (error) {
    console.error('Error resetting Mixpanel user:', error);
  }
};

// The ANALYTICS_EVENTS object that was here has been removed. 