import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { Colors } from '../../constants/Colors'; // Assuming Colors constants exist

export default function ErrorScreen() {
  const router = useRouter();

  const handleRetry = () => {
    // Navigate back to the login screen
    router.replace('/(auth)/login');
  };

  // Basic styling - adapt Colors based on your theme setup
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: Colors.dark.background, // Example dark background
    },
    iconContainer: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: Colors.dark.text, // Example dark text
      marginBottom: 10,
      textAlign: 'center',
      fontFamily: 'SpaceMono', // Use your app's font
    },
    message: {
      fontSize: 16,
      color: Colors.dark.tint, // Example secondary text
      textAlign: 'center',
      marginBottom: 30,
      fontFamily: 'SpaceMono', // Use your app's font
    },
    button: {
      backgroundColor: Colors.dark.tint, // Example button color
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 25,
      flexDirection: 'row',
      alignItems: 'center',
    },
    buttonText: {
      color: Colors.dark.background, // Example button text color
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 10,
      fontFamily: 'SpaceMono', // Use your app's font
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={Colors.dark.error} /> 
      </View>
      <Text style={styles.title}>Oops! Something went wrong.</Text>
      <Text style={styles.message}>
        We encountered an unexpected issue. Please try returning to the login screen.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleRetry} activeOpacity={0.8}>
         <Ionicons name="refresh-outline" size={20} color={Colors.dark.background} />
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
} 