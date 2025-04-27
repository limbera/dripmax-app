import { useEffect } from 'react';
import { MixpanelProperties } from 'mixpanel-react-native';
import { trackScreenView } from '@/utils/analytics';

/**
 * Hook to track screen views in analytics
 * 
 * @param screenName The name of the screen to track
 * @param properties Optional additional properties to include with the screen view
 * 
 * @example
 * const MyScreen = () => {
 *   useScreenTracking('My Screen');
 *   return <View>...</View>;
 * };
 */
export function useScreenTracking(screenName: string, properties: MixpanelProperties = {}) {
  useEffect(() => {
    trackScreenView(screenName, properties);
  }, [screenName, JSON.stringify(properties)]);
}

export default useScreenTracking; 