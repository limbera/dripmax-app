import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleAuthAvailable } from '../../utils/appleAuth';

interface AuthButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function AuthButton({ 
  provider, 
  onPress, 
  isLoading = false, 
  style, 
  textStyle 
}: AuthButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  
  // Check if Apple authentication is available
  useEffect(() => {
    if (provider === 'apple') {
      isAppleAuthAvailable().then(available => {
        setIsAppleAvailable(available);
      });
    }
  }, [provider]);
  
  const getProviderIcon = () => {
    switch (provider) {
      case 'google':
        return <Ionicons name="logo-google" size={20} color={isDark ? '#fff' : '#000'} />;
      case 'apple':
        return <Ionicons name="logo-apple" size={20} color={isDark ? '#fff' : '#000'} />;
      default:
        return null;
    }
  };

  const getProviderText = () => {
    switch (provider) {
      case 'google':
        return 'Sign in with Google';
      case 'apple':
        return 'Sign in with Apple';
      default:
        return '';
    }
  };

  // Render native Apple button if available
  if (provider === 'apple' && isAppleAvailable && !isLoading) {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={[styles.appleButton, style]}
        onPress={onPress}
      />
    );
  }

  // Render custom button for Google or when Apple is not available
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
        style,
      ]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={isDark ? '#fff' : '#000'} />
      ) : (
        <>
          {getProviderIcon()}
          <Text style={[
            styles.text,
            isDark ? styles.textDark : styles.textLight,
            textStyle,
          ]}>
            {getProviderText()}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 250,
  },
  buttonLight: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonDark: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  textLight: {
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
  appleButton: {
    height: 44,
    width: 250,
    marginVertical: 8,
  },
}); 