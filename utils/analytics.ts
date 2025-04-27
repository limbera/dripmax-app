import { MixpanelProperties } from 'mixpanel-react-native';
import { Platform } from 'react-native';
import { getMixpanel } from '@/components/MixpanelProvider';
import { 
  ANALYTICS_EVENTS, 
  trackEventCore, 
  identifyUserCore, 
  resetUserCore,
  getMixpanelInstanceCore 
} from './analyticsCore';

// Re-export ANALYTICS_EVENTS from analyticsCore
export { ANALYTICS_EVENTS };

// Helper function to track app events
export const trackEvent = (eventName: string, properties: MixpanelProperties = {}) => {
  // Try to get instance from MixpanelProvider first for backward compatibility
  const mixpanel = getMixpanel() || getMixpanelInstanceCore();
  if (!mixpanel) return;
  
  trackEventCore(eventName, properties);
};

// Track screen views
export const trackScreenView = (screenName: string, properties: MixpanelProperties = {}) => {
  trackEvent(ANALYTICS_EVENTS.SCREEN_VIEWED, {
    screen_name: screenName,
    ...properties,
  });
};

// Higher-order function to create screen view tracking
export const withScreenTracking = (screenName: string) => {
  return () => {
    trackScreenView(screenName);
  };
};

// Helper function to identify users in analytics
export const identifyUser = (userId: string, userProperties: MixpanelProperties = {}) => {
  identifyUserCore(userId, userProperties);
};

// Helper function to reset user in analytics
export const resetUser = () => {
  resetUserCore();
};

// Track onboarding progress
export const trackOnboardingStep = (
  stepName: string, 
  stepNumber: number, 
  totalSteps: number,
  properties: MixpanelProperties = {}
) => {
  trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
    step_name: stepName,
    step_number: stepNumber,
    total_steps: totalSteps,
    progress_percentage: Math.round((stepNumber / totalSteps) * 100),
    ...properties
  });
};

// Track outfit workflow events
export const trackOutfitWorkflow = {
  scanStarted: (properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.SCAN_STARTED, properties);
  },
  
  photoTaken: (properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.PHOTO_TAKEN, properties);
  },
  
  photoPreview: (properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.PHOTO_PREVIEW, properties);
  },
  
  analysisStarted: (properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED, properties);
  },
  
  analysisCompleted: (outfitId: string, durationMs: number, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.ANALYSIS_COMPLETED, {
      outfit_id: outfitId,
      duration_ms: durationMs,
      ...properties
    });
  }
};

// Track outfit actions
export const trackOutfitActions = {
  added: (outfitId: string, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.OUTFIT_ADDED, {
      outfit_id: outfitId,
      ...properties
    });
  },
  
  viewed: (outfitId: string, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.OUTFIT_VIEWED, {
      outfit_id: outfitId,
      ...properties
    });
  },
  
  deleted: (outfitId: string, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.OUTFIT_DELETED, {
      outfit_id: outfitId,
      ...properties
    });
  },
  
  shared: (outfitId: string, shareMethod: string, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.OUTFIT_SHARED, {
      outfit_id: outfitId,
      share_method: shareMethod,
      ...properties
    });
  },
  
  saved: (outfitId: string, properties: MixpanelProperties = {}) => {
    trackEvent(ANALYTICS_EVENTS.OUTFIT_SAVED, {
      outfit_id: outfitId,
      ...properties
    });
  }
}; 