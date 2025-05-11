import React, { createContext, useContext, useEffect, useState } from 'react';
import { Mixpanel } from 'mixpanel-react-native';
import { useAuthStore } from '@/stores/authStore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setMixpanelInstance } from '@/utils/analyticsCore';

// Create a context to make Mixpanel accessible throughout the app
const MixpanelContext = createContext<Mixpanel | null>(null);

// Create a singleton instance of Mixpanel that can be used outside of React components
let mixpanelInstance: Mixpanel | null = null;

// Function to get the Mixpanel instance outside of React components
export const getMixpanel = (): Mixpanel | null => {
  return mixpanelInstance;
};

// Hook to use Mixpanel within React components
export const useMixpanel = () => {
  return useContext(MixpanelContext);
};

export const MixpanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mixpanel, setMixpanel] = useState<Mixpanel | null>(null);
  const { session, user } = useAuthStore();
  const colorScheme = useColorScheme();

  // Initialize Mixpanel on component mount
  useEffect(() => {
    const initMixpanel = async () => {
      try {
        // If already initialized, don't initialize again
        if (mixpanelInstance) {
          setMixpanel(mixpanelInstance);
          return;
        }

        // Get the token from app config
        const mixpanelToken = Constants.expoConfig?.extra?.mixpanelToken || '';
        if (!mixpanelToken || mixpanelToken === 'YOUR_MIXPANEL_TOKEN') {
          console.warn('Mixpanel token not set in app.config.js');
          return;
        }

        // Disable automatic events tracking for now
        const trackAutomaticEvents = false;
        
        // Create Mixpanel instance
        const instance = new Mixpanel(mixpanelToken, trackAutomaticEvents);
        
        // Enable debug mode in development
        if (__DEV__) {
          instance.setLoggingEnabled(true);
        }
        
        // Initialize Mixpanel
        await instance.init();
        
        // Register default super properties
        instance.registerSuperProperties({
          'App Version': Constants.expoConfig?.version || '',
          'Platform': Platform.OS,
          'Platform Version': Platform.Version,
          'Color Scheme': colorScheme,
        });
        
        console.log('Mixpanel initialized successfully');
        
        // Store the instance in the singleton variable
        mixpanelInstance = instance;
        
        // Store the instance in analyticsCore to break circular dependency
        setMixpanelInstance(instance);
        
        setMixpanel(instance);
      } catch (error) {
        console.error('Error initializing Mixpanel:', error);
      }
    };

    initMixpanel();

    // Clean up on unmount
    return () => {
      if (mixpanel) {
        mixpanel.flush();
      }
    };
  }, []);

  // Update user identity when auth state changes
  useEffect(() => {
    if (!mixpanel || !user) return;

    if (user) {
      // Identify the user in Mixpanel
      mixpanel.identify(user.id);
      
      // Set user properties
      mixpanel.getPeople().set({
        '$email': user.email,
        '$name': user.user_metadata?.full_name || user.email,
        'Auth Provider': user.app_metadata?.provider || 'unknown',
        '$created': user.created_at,
      });
      
      console.log('User identified in Mixpanel:', user.id);
    }
  }, [mixpanel, user]);

  return (
    <MixpanelContext.Provider value={mixpanel}>
      {children}
    </MixpanelContext.Provider>
  );
};

export default MixpanelProvider; 