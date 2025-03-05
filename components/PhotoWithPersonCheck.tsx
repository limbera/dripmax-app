import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MultiPersonDetector from './MultiPersonDetector';

export default function PhotoWithPersonCheck() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const captureImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Camera permission is required to take photos");
        return;
      }

      // Take a photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // User captured a photo
        setCapturedImage(result.assets[0].uri);
        setIsProcessing(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleMultipleDetection = (hasMultiple: boolean) => {
    setIsProcessing(false);
    
    if (hasMultiple) {
      Alert.alert(
        "Multiple People Detected",
        "We detected more than one person in your photo. For best results, please take a photo with just yourself.",
        [
          {
            text: "Retry",
            onPress: () => {
              setCapturedImage(null);
            },
            style: "cancel"
          },
          {
            text: "Continue Anyway",
            onPress: () => {
              // Process the image anyway
              console.log("User chose to continue with multiple people");
              // Here you would handle the image as normal
              processAcceptedImage(capturedImage);
            }
          }
        ]
      );
    } else {
      // No multiple people detected, proceed normally
      console.log("Single person photo accepted");
      processAcceptedImage(capturedImage);
    }
  };

  const processAcceptedImage = (imageUri: string | null) => {
    if (!imageUri) return;
    
    // Process the accepted image here
    console.log("Processing accepted image:", imageUri);
    
    // For demo purposes, we'll just clear the image after 2 seconds
    setTimeout(() => {
      setCapturedImage(null);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: capturedImage }} 
            style={styles.previewImage} 
            resizeMode="contain"
          />
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <Text style={styles.processingText}>Analyzing photo...</Text>
            </View>
          )}
          <MultiPersonDetector 
            imageUri={capturedImage} 
            onMultipleDetected={handleMultipleDetection} 
          />
        </View>
      ) : (
        <View style={styles.cameraPlaceholder}>
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={captureImage}
          >
            <Text style={styles.captureButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 