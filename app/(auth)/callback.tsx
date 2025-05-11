import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuthStore } from '../../stores/authStore';
import { navigationLogger, authLogger } from '../../utils/logger';
import { useSubscription } from '../../hooks/useSubscription';

export default function AuthCallback() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore(state => ({
    isAuthenticated: !!state.session,
    isLoading: state.isLoading
  }));
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Add logging for component mount
  useEffect(() => {
    navigationLogger.info('Callback component mounted');
    
    // Add cleanup function to log when component unmounts
    return () => {
      navigationLogger.debug('Callback component unmounted');
    };
  }, []);

  // Navigate based on auth state
  useEffect(() => {
    const handleNavigation = async () => {
      try {
        navigationLogger.debug('Handling navigation', { 
          isAuthenticated, 
          isLoading,
          hasActiveSubscription,
          isSubscriptionLoading
        });
        
        if (!isLoading && !isSubscriptionLoading) {
          if (isAuthenticated) {
            navigationLogger.info('Authenticated, navigating to protected area');
            router.replace('/(protected)');
          } else {
            navigationLogger.info('Not authenticated, navigating to login');
            router.replace('/(auth)/login');
          }
        }
      } catch (error: any) {
        navigationLogger.error('Error handling navigation', { 
          error: error.message,
          stack: error.stack
        });
        router.replace('/(auth)/login');
      }
    };

    handleNavigation();
  }, [isAuthenticated, isLoading, hasActiveSubscription, isSubscriptionLoading, router]);

  return (
    <View style={[
      styles.container,
      { backgroundColor: 'black' }
    ]}>
      <ActivityIndicator size="large" color="#00FF77" />
      <Text style={[
        styles.text,
        { color: 'white', fontFamily: 'RobotoMono-Regular' }
      ]}>
        Completing sign in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
}); 