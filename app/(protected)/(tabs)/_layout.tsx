import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, Platform, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  // Get the safe area insets
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: 'black',
            borderTopColor: '#333',
            height: 70 + (Platform.OS === 'ios' ? insets.bottom : 0), // Account for bottom safe area
            paddingTop: 8,
            paddingBottom: 12 + (Platform.OS === 'ios' ? insets.bottom : 0), // Add bottom inset to padding
          },
          tabBarActiveTintColor: '#00FF77',
          tabBarInactiveTintColor: '#888888',
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 6,
            fontFamily: 'RobotoMono-Regular',
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="drips"
          options={{
            title: 'Drips',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="water-outline" size={size + 4} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wardrobe"
          options={{
            title: 'Wardrobe',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shirt-outline" size={size + 4} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size + 4} color={color} />
            ),
          }}
        />
        
        {/* Hide the create and index routes from tabs */}
        <Tabs.Screen
          name="create"
          options={{
            href: null,
          }}
        />
        
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
} 