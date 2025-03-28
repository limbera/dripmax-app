import React, { useEffect } from 'react';
import { Tabs, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { ActivityIndicator, View, Text } from 'react-native';
import { navigationLogger } from '../../utils/logger';
import { useRouter } from 'expo-router';

export default function ProtectedLayout() {
  const { isLoading, initialized, isAuthenticated, user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Log component mount and unmount
  useEffect(() => {
    navigationLogger.info('Protected layout mounted', {
      isLoading,
      initialized,
      isAuthenticated,
      hasUser: !!user
    });

    // Redirect to tabs when accessing the protected layout directly
    if (!isLoading && initialized && isAuthenticated) {
      router.replace('/(protected)/(tabs)/drips');
    }

    return () => {
      navigationLogger.debug('Protected layout unmounted');
    };
  }, [isLoading, initialized, isAuthenticated]);

  // Log when auth state changes
  useEffect(() => {
    navigationLogger.debug('Auth state updated in protected layout', {
      isLoading,
      initialized,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id
    });
  }, [isLoading, initialized, isAuthenticated, user]);

  // Show loading indicator while checking authentication
  if (isLoading || !initialized) {
    navigationLogger.info('Showing loading indicator', {
      isLoading,
      initialized,
      isAuthenticated
    });
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={{ marginTop: 20, color: 'white', fontFamily: 'RobotoMono-Regular' }}>
          {isLoading ? 'Loading...' : 'Initializing...'}
        </Text>
      </View>
    );
  }

  navigationLogger.info('Rendering protected layout', {
    isAuthenticated,
    hasUser: !!user
  });

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'black',
        },
        headerTintColor: 'white',
        contentStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="home"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="outfit/[id]"
        options={{
          title: 'Ratings',
          headerTitle: () => (
            <Text style={{
              color: 'white',
              fontFamily: 'RobotoMono',
              fontWeight: 'bold',
              fontStyle: 'italic',
              fontSize: 18,
            }}>
              Ratings
            </Text>
          ),
          headerBackVisible: false,
          headerBackTitle: 'Home',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          title: 'Take Photo',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          headerBackTitle: 'Home',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="garments/index"
        options={{
          headerShown: true,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="garments/camera"
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="garments/[id]"
        options={{
          headerShown: true,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 