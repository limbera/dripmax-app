import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerStyle: {
            backgroundColor: 'black',
          },
          headerTintColor: 'white',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerStyle: {
            backgroundColor: 'black',
          },
          headerTintColor: 'white',
        }}
      />
    </Stack>
  );
} 