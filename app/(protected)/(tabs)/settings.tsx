import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform, ActionSheetIOS, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../../services/supabase';

export default function SettingsScreen() {
  const { user, signOut, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const handleGiveFeedback = async () => {
    const url = 'mailto:feedback@drelimbo.com';
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
  
  const handleNotificationSettings = () => {
    router.push('/(protected)/profile/notifications');
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
  
  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST'
      });

      if (error) throw error;

      // Sign out will clear auth state
      await signOut();
      
      // Navigate to auth screen
      router.replace('/(auth)');
      
      // Show confirmation (optional, as navigation will likely happen before this is seen)
      Alert.alert('Account Deleted', 'Your account has been successfully deleted');
      
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again.'
      );
    } finally {
      setIsDeletingAccount(false);
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
                  onPress: handleDeleteAccount
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
                    onPress: handleDeleteAccount
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Stack.Screen 
        options={{
          title: 'Settings',
          headerLargeTitle: false,
          headerStyle: {
            backgroundColor: 'black',
          },
          headerTintColor: 'white',
          headerTitle: () => (
            <Text style={{
              fontFamily: 'RobotoMono',
              fontWeight: 'bold',
              fontStyle: 'italic',
              color: '#00FF77',
              fontSize: 24,
            }}>
              dripmax
            </Text>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Settings</Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleGiveFeedback}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="ear-outline" size={24} color="white" />
            </View>
            <Text style={styles.buttonText}>
              Give Feedback
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetHelp}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color="white" />
            </View>
            <Text style={styles.buttonText}>
              Get Help
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleManageAccount}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="construct-outline" size={24} color="white" />
            </View>
            <Text style={styles.buttonText}>
              Manage Account
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={styles.footerText}>
              Terms
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.footerDivider}>•</Text>
          
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={styles.footerText}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.versionText}>
          Version 1.2.2
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
  },
  buttonsContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20.8, // 30% taller than the original 16
    borderRadius: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00FF77',
    backgroundColor: 'black',
    width: '100%',
  },
  buttonIconContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
    flex: 1,
    marginRight: 40, // To balance the icon width and keep text centered
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
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  footerDivider: {
    marginHorizontal: 8,
    fontSize: 14,
    color: 'white',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 24,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'left',
    paddingLeft: 8,
  },
}); 