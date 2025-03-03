import React, { useEffect } from 'react';
import { Tabs, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { ActivityIndicator, View, Text } from 'react-native';
import { navigationLogger } from '../../utils/logger';

export default function ProtectedLayout() {
  const { isLoading, initialized, isAuthenticated, user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Log component mount and unmount
  useEffect(() => {
    navigationLogger.info('Protected layout mounted', {
      isLoading,
      initialized,
      isAuthenticated,
      hasUser: !!user
    });

    return () => {
      navigationLogger.debug('Protected layout unmounted');
    };
  }, []);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? Colors.dark.background : Colors.light.background }}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={{ marginTop: 20, color: isDark ? Colors.dark.text : Colors.light.text }}>
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
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        },
        headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
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
          headerTitle: 'Ratings',
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
          presentation: 'modal',
          animation: 'slide_from_bottom',
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
    </Stack>
  );
} 