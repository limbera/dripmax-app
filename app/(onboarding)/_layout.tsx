import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'black',
        },
        headerTintColor: 'white',
        contentStyle: {
          backgroundColor: 'black',
        },
      }}
    >
      <Stack.Screen
        name="capture"
        options={{
          title: 'Capture Outfit',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="scanning"
        options={{
          title: 'Analyzing',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="results"
        options={{
          title: 'Outfit Analysis',
          headerShown: false,
        }}
      />
    </Stack>
  );
} 