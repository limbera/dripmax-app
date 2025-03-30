import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        },
        headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        },
      }}
    >
      {/* Hide header for paywall screens */}
      <Stack.Screen
        name="paywall"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SuperwallPaywall"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 