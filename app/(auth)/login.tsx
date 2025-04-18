import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, isLoading, error } = useAuth();
  
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
  
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Stack.Screen 
        options={{ 
          title: '',
          headerShown: false,
        }} 
      />

      {/* Header Section with Logo and Catchphrase */}
      <View style={styles.header}>
        <Text style={styles.title}>
          dripmax
        </Text>
        <Text style={styles.catchphrase}>
          Rate your outfit out of 10.
        </Text>
      </View>
      
      {/* Phone Preview Area */}
      <View style={styles.phonePreview}>
        <Image 
          source={require('../../assets/images/phone-placeholder.png')} 
          style={styles.phoneMockup}
          resizeMode="contain"
        />
      </View>
      
      {/* Auth Buttons Area */}
      <View style={styles.authSection}>
        <View style={styles.continueWithContainer}>
          <View style={styles.continueWithLine} />
          <Text style={styles.continueText}>continue with</Text>
          <View style={styles.continueWithLine} />
        </View>
        <View style={styles.buttonsRow}>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={signInWithApple}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-apple" size={24} color="white" />
                <Text style={styles.authButtonText}>
                  Apple
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.authButton}
            onPress={signInWithGoogle}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-google" size={24} color="white" />
                <Text style={styles.authButtonText}>
                  Google
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you accept our{' '}
          <Text style={styles.linkText} onPress={handleTerms}>
            Terms of Service
          </Text>
          {' '}and acknowledge receipt of our{' '}
          <Text style={styles.linkText} onPress={handlePrivacy}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'black',
    padding: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: 30,
  },
  title: {
    fontFamily: 'RobotoMono',
    fontSize: 36,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#00FF77',
    marginBottom: 10,
  },
  catchphrase: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    maxWidth: '80%',
  },
  phonePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.5,
    marginBottom: 30,
  },
  phoneMockup: {
    width: width * 0.8,
    height: height * 0.5,
  },
  authSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueWithContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  continueWithLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  continueText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 10,
    opacity: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  authButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: '#00FF77',
    width: '48%',
    marginVertical: 10,
    borderRadius: 5,
    padding: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  errorText: {
    color: '#FF0088',
    marginTop: 20,
    textAlign: 'center',
  },
  footer: {
    marginBottom: 40,
    width: '100%',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  linkText: {
    color: '#666',
    textDecorationLine: 'underline',
  },
}); 