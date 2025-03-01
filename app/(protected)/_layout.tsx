import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
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

  navigationLogger.info('Rendering tabs', {
    isAuthenticated,
    hasUser: !!user
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? Colors.dark.tint : Colors.light.tint,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
          borderTopColor: isDark ? '#333' : '#e0e0e0',
        },
        headerStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        },
        headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera/index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => <Ionicons name="camera" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
} 