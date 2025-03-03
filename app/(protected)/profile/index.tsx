import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform, ActionSheetIOS } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const handleGiveFeedback = async () => {
    const url = 'mailto:feedback@dripmax.app';
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Could not open email client');
    }
  };
  
  const handleGetHelp = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.dripmax.app/help');
    } catch (error) {
      Alert.alert('Error', 'Could not open help page');
    }
  };
  
  const handleTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.dripmax.app/terms');
    } catch (error) {
      Alert.alert('Error', 'Could not open terms page');
    }
  };
  
  const handlePrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.dripmax.app/privacy');
    } catch (error) {
      Alert.alert('Error', 'Could not open privacy page');
    }
  };
  
  const handleManageAccount = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Logout', 'Delete Account'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (buttonIndex: number) => {
          if (buttonIndex === 1) {
            signOut();
          } else if (buttonIndex === 2) {
            Alert.alert(
              'Delete Account',
              'Are you sure you want to delete your account? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => {
                    // Implement delete account functionality
                    Alert.alert('Account Deleted', 'Your account has been deleted');
                  }
                }
              ]
            );
          }
        }
      );
    } else {
      Alert.alert(
        'Manage Account',
        'Select an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', onPress: signOut },
          { 
            text: 'Delete Account', 
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                      // Implement delete account functionality
                      Alert.alert('Account Deleted', 'Your account has been deleted');
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Profile',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={isDark ? Colors.dark.text : Colors.light.text} 
              />
              <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>
                Home
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[
        styles.container,
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              { color: isDark ? Colors.dark.text : Colors.light.text }
            ]}>
              0
            </Text>
            <Text style={[
              styles.statLabel,
              { color: isDark ? '#aaa' : '#777' }
            ]}>
              Outfits
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              { color: isDark ? Colors.dark.text : Colors.light.text }
            ]}>
              0
            </Text>
            <Text style={[
              styles.statLabel,
              { color: isDark ? '#aaa' : '#777' }
            ]}>
              Average Rating
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isDark ? '#333' : '#f5f5f5' }
            ]}
            onPress={handleGiveFeedback}
          >
            <Ionicons name="mail-outline" size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            <Text style={[
              styles.buttonText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Give Feedback
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isDark ? '#333' : '#f5f5f5' }
            ]}
            onPress={handleGetHelp}
          >
            <Ionicons name="help-circle-outline" size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            <Text style={[
              styles.buttonText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Get Help
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isDark ? '#333' : '#f5f5f5' }
            ]}
            onPress={handleManageAccount}
          >
            <Ionicons name="settings-outline" size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            <Text style={[
              styles.buttonText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Manage Account
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={[
              styles.footerText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Terms
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.footerDivider, { color: isDark ? '#aaa' : '#777' }]}>•</Text>
          
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={[
              styles.footerText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  buttonsContainer: {
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerDivider: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
}); 