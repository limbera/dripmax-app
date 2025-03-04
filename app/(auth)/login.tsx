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
      <StatusBar style="light" />
      
      <Stack.Screen 
        options={{ 
          title: '',
          headerShown: false,
        }} 
      />

      {/* Logo Area */}
      <View style={styles.logoContainer}>
        <Text style={styles.title}>
          dripmax
        </Text>
        <Text style={styles.subtitle}>
          AI-powered fashion analysis
        </Text>
      </View>
      
      {/* Buttons Area */}
      <View style={styles.buttonContainer}>
        {/* Google Sign In Button */}
        <TouchableOpacity 
          style={styles.authButton}
          onPress={signInWithGoogle}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="logo-google" size={24} color="white" />
              </View>
              <Text style={styles.authButtonText}>
                Sign in with Google
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Apple Sign In Button */}
        <TouchableOpacity 
          style={styles.authButton}
          onPress={signInWithApple}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="logo-apple" size={24} color="white" />
              </View>
              <Text style={styles.authButtonText}>
                Sign in with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText} onPress={handleTerms}>
            Terms of Service
          </Text>
          {' '}and{' '}
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
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.15,
  },
  title: {
    fontFamily: 'RobotoMono',
    fontSize: 48,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#00FF77',
    marginBottom: 10,
  },
  subtitle: {
    color: 'white',
    fontSize: 16,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: '#00FF77',
    width: width * 0.8,
    marginVertical: 10,
    borderRadius: 100,
    padding: 20,
  },
  buttonIconContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  authButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'RobotoMono-Regular',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To balance the icon width and keep text centered
  },
  errorText: {
    color: '#FF0088',
    marginTop: 20,
    textAlign: 'center',
  },
  footer: {
    marginBottom: 40,
    width: '80%',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 12,
  },
  linkText: {
    color: '#999',
    textDecorationLine: 'underline',
  },
}); 