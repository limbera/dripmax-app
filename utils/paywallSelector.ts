import { router } from 'expo-router';

/**
 * Utility to direct users to the Superwall paywall
 * We use Superwall for paywalls and RevenueCat for subscription management
 */
export const navigateToPaywall = (redirect?: string) => {
  // Build the query params
  const params = new URLSearchParams();
  if (redirect) {
    params.append('redirect', redirect);
  }
  
  // Always navigate to the Superwall paywall
  router.replace({
    pathname: '/(auth)/SuperwallPaywall',
    params: Object.fromEntries(params)
  });
}; 