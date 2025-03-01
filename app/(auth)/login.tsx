import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../hooks/useAuth';
import AuthButton from '../../components/ui/AuthButton';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, isLoading, error } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <Stack.Screen 
        options={{ 
          title: '',
          headerShown: false,
        }} 
      />
      
      <Text style={[
        styles.title,
        { color: isDark ? Colors.dark.text : Colors.light.text }
      ]}>
        Dripmax
      </Text>
      
      <View style={styles.buttonContainer}>
        <AuthButton 
          provider="google" 
          onPress={signInWithGoogle} 
          isLoading={isLoading} 
        />
        
        <AuthButton 
          provider="apple" 
          onPress={signInWithApple} 
          isLoading={isLoading} 
        />
      </View>
      
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#ff3b30',
    marginTop: 20,
    textAlign: 'center',
  },
}); 