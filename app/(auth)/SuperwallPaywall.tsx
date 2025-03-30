import React, { useEffect, useCallback, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { NativeModules, NativeEventEmitter } from 'react-native';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';

// Check if Superwall is available
const hasSuperwallModule = !!NativeModules.Superwall;

// Import Superwall functions if available
const { initPaywall, trigger, identifyUser } = hasSuperwallModule ? NativeModules.Superwall : { 
  initPaywall: null, 
  trigger: null, 
  identifyUser: null 
};

// Create event emitter only if Superwall module is available
const eventEmitter = hasSuperwallModule ? new NativeEventEmitter(NativeModules.Superwall) : null;

export default function SuperwallPaywallScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { currentOffering, isLoading, hasActiveSubscription, checkEntitlementStatus } = useSubscription();
  const { user } = useAuth();
  const { pendingImageUri } = usePendingImageStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [superwallError, setSuperwallError] = useState(false);

  // Check for Superwall module availability
  useEffect(() => {
    if (!hasSuperwallModule) {
      console.error('[Superwall] Native module not found. You must build a development or production build that includes native modules.');
      setSuperwallError(true);
      setIsInitializing(false);
      
      // Show alert to developer
      if (__DEV__) {
        Alert.alert(
          'Superwall Module Missing',
          'The Superwall native module is not available. This typically happens when using Expo Go or when native modules are not properly linked.\n\nTo fix this:\n1. Create a development build with "eas build"\n2. Install and run that build\n\nFalling back to a simple paywall experience.',
          [{ text: 'OK' }]
        );
      }
    }
  }, []);

  // Debug console logs
  useEffect(() => {
    console.log('[Superwall DEBUG] Current subscription status:', { 
      hasActiveSubscription, 
      isLoading,
      redirect,
      userId: user?.id,
      hasPendingImage: !!pendingImageUri,
      superwallAvailable: hasSuperwallModule
    });
  }, [hasActiveSubscription, isLoading, redirect, user, pendingImageUri]);

  // Set up event listener for Superwall events (only if module is available)
  useEffect(() => {
    if (!hasSuperwallModule || !eventEmitter) return;
    
    const subscription = eventEmitter.addListener('superwallAnalyticsEvent', (event) => {
      console.log('[Superwall] Event:', event);
      
      // Handle purchase events
      if (event?.event === 'paywall_purchase_initiated') {
        handlePurchase(event.productId);
      }
      
      // Handle successful purchases
      if (event?.event === 'paywall_purchase_completed') {
        checkEntitlementStatus().then(hasSubscription => {
          if (hasSubscription) {
            router.replace('/(protected)');
          }
        });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [router, checkEntitlementStatus, hasSuperwallModule]);

  // Handle purchases through RevenueCat
  const handlePurchase = async (productId: string) => {
    console.log('[Superwall] Purchase initiated for product:', productId);
    
    // Find the package in the current offering
    if (!currentOffering) {
      console.error('[Superwall] No current offering available');
      return;
    }
    
    const pkg = currentOffering.availablePackages.find(
      p => p.product.identifier === productId
    );
    
    if (!pkg) {
      console.error('[Superwall] Product not found in available packages:', productId);
      return;
    }
    
    try {
      // Purchase through RevenueCat
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      // Check if the purchase was successful
      const hasEntitlement = !!customerInfo.entitlements.active['all_access'];
      
      // Refresh subscription status
      await checkEntitlementStatus();
      
      if (hasEntitlement) {
        router.replace('/(protected)');
      }
    } catch (error) {
      console.error('[Superwall] Purchase error:', error);
    }
  };

  // Initialize Superwall when component mounts (only if module is available)
  useEffect(() => {
    const initializeSuperwall = async () => {
      if (!hasSuperwallModule || !initPaywall) {
        setIsInitializing(false);
        return;
      }
      
      try {
        // Get API keys from Constants
        const superwallApiKey = Constants.expoConfig?.extra?.superwallApiKey || '';
        const revenuecatApiKey = Constants.expoConfig?.extra?.revenuecatSuperwallApiKey || '';
        
        console.log('[Superwall] Initializing with keys:', { 
          superwallApiKey: superwallApiKey ? 'set' : 'missing', 
          revenuecatApiKey: revenuecatApiKey ? 'set' : 'missing'
        });
        
        // Initialize Superwall with API keys
        await initPaywall(superwallApiKey, revenuecatApiKey);
        
        // Set user identity if available
        if (user?.id && identifyUser) {
          await identifyUser(user.id);
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error('[Superwall] Initialization error:', error);
        setSuperwallError(true);
        setIsInitializing(false);
      }
    };
    
    initializeSuperwall();
  }, [user, hasSuperwallModule]);

  // Check if user already has a subscription when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (hasActiveSubscription) {
        console.log('[Superwall] User has active subscription, redirecting to protected area');
        router.replace('/(protected)');
      }
    }, [hasActiveSubscription, router])
  );

  // Present the paywall when component is ready (only if module is available)
  useEffect(() => {
    const presentPaywall = async () => {
      if (isInitializing || isLoading || hasActiveSubscription || superwallError || !hasSuperwallModule || !trigger) {
        return;
      }
      
      try {
        console.log('[Superwall] Presenting paywall');
        
        // Trigger the default paywall
        const result = await trigger('paywall_screen');
        
        console.log('[Superwall] Paywall result:', result);
        
        // Check if user has active subscription after paywall interaction
        const hasSubscription = await checkEntitlementStatus();
        if (hasSubscription) {
          router.replace('/(protected)');
        }
      } catch (error) {
        console.error('[Superwall] Error presenting paywall:', error);
        setSuperwallError(true);
      }
    };
    
    presentPaywall();
  }, [isInitializing, isLoading, hasActiveSubscription, router, checkEntitlementStatus, superwallError, hasSuperwallModule]);

  // Handle successful purchase or subscription check
  useEffect(() => {
    if (hasActiveSubscription) {
      console.log('[Superwall] User has active subscription, redirecting to protected area');
      router.replace('/(protected)');
    }
  }, [hasActiveSubscription, router]);

  if (isLoading || isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </SafeAreaView>
    );
  }

  // If there's an error with Superwall, show a fallback UI
  if (superwallError || !hasSuperwallModule) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.fallbackPaywallContainer}>
          <Text style={styles.fallbackTitle}>Get Dripmax Pro</Text>
          <Text style={styles.fallbackDescription}>
            Unlock advanced features and detailed outfit analysis with Dripmax Pro subscription.
          </Text>
          
          {currentOffering && currentOffering.availablePackages.map((pkg, index) => (
            <View 
              key={pkg.identifier} 
              style={[
                styles.packageCard,
                index === 0 ? styles.primaryPackage : {} // Highlight first package
              ]}
            >
              <Text style={styles.packageTitle}>
                {pkg.product.title || (
                  pkg.packageType === 'ANNUAL' ? 'Annual' : 
                  pkg.packageType === 'MONTHLY' ? 'Monthly' : 
                  pkg.packageType === 'WEEKLY' ? 'Weekly' : 'Subscription'
                )}
              </Text>
              <Text style={styles.packagePrice}>
                {pkg.product.priceString || `${pkg.product.price} ${pkg.product.currencyCode}`}
              </Text>
              <Text style={styles.packageDescription}>
                {pkg.product.description || (
                  pkg.packageType === 'ANNUAL' ? 'Save with yearly billing' : 
                  pkg.packageType === 'MONTHLY' ? 'Billed monthly' : 
                  pkg.packageType === 'WEEKLY' ? 'Billed weekly' : 'Subscribe now'
                )}
              </Text>
              <View 
                style={[
                  styles.purchaseButton,
                  index === 0 ? styles.primaryButton : {}
                ]}
                onTouchEnd={() => handlePurchase(pkg.product.identifier)}
              >
                <Text style={styles.buttonText}>Subscribe</Text>
              </View>
            </View>
          ))}
          
          <Text style={styles.termsText}>
            Payment will be charged to your Apple ID account at the confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty view since Superwall will present the paywall
  return (
    <View style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  fallbackPaywallContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00FF77',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  packageCard: {
    width: '100%',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryPackage: {
    borderColor: '#00FF77',
    backgroundColor: '#113322',
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    color: '#00FF77',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#BBB',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#00FF77',
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  termsText: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'RobotoMono-Regular',
    lineHeight: 14,
  },
}); 