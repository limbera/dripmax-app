import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, Platform, View, Dimensions, ActionSheetIOS, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function TabsLayout() {
  // Get the safe area insets
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const router = useRouter();
  
  // Function to show action sheet when + is tapped
  const showCreateOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Rate My Outit', 'Add to Wardrobe'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Rate Outfit option
            router.push('/(protected)/camera');
          } else if (buttonIndex === 2) {
            // Add Garment option
            router.push('/(protected)/garments/camera');
          }
        }
      );
    } else {
      // For Android
      Alert.alert(
        'Create',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Rate My Outfit', 
            onPress: () => router.push('/(protected)/camera'),
          },
          { 
            text: 'Add To Wardrobe', 
            onPress: () => router.push('/(protected)/garments/camera'),
          },
        ]
      );
    }
  };
  
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
            tabBarItemStyle: {
              width: width / 5.5, // Narrower than before
            }
          }}
        />
        <Tabs.Screen
          name="wardrobe"
          options={{
            title: 'Wardrobe',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shirt-outline" size={size + 4} color={color} />
            ),
            tabBarItemStyle: {
              width: width / 5.5, // Narrower than before
            }
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size + 4} color={color} />
            ),
            tabBarItemStyle: {
              width: width / 5.5, // Narrower than before
            }
          }}
        />
        
        {/* Prominent "+" Tab (now positioned last) */}
        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarItemStyle: {
              width: width / 3.5, // Wider than the other tabs
            },
            tabBarIcon: () => (
              <View style={{
                position: 'absolute',
                bottom: 5,
                height: 60,
                width: 60,
                borderRadius: 30,
                backgroundColor: '#00FF77',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 6,
              }}>
                <Ionicons name="add" size={36} color="black" />
              </View>
            ),
            tabBarLabel: () => null, // Remove label for the + button
          }}
          listeners={() => ({
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              // Show action sheet with create options
              showCreateOptions();
            },
          })}
        />
        
        {/* Hide the index route from tabs */}
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