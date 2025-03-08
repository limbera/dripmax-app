import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { createGarment } from '../../../services/supabase';

export default function GarmentCameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<any>(null);

  // Request camera permission if not granted
  if (!permission?.granted) {
    // Request permission
    requestPermission();
  }

  // Toggle between front and back camera
  const toggleCameraFacing = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };

  // Toggle flash
  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  // Take a picture
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        
        // Compress the image to reduce size
        const compressedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        setCapturedImage(compressedImage.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    }
  };

  // Save the garment to Supabase
  const saveGarment = async () => {
    if (!capturedImage) return;
    
    try {
      setIsProcessing(true);
      
      const { garment, error } = await createGarment(capturedImage);
      
      if (error) {
        console.error('Error creating garment:', error);
        Alert.alert('Error', 'Failed to save garment. Please try again.');
        throw error;
      }
      
      // Replace current screen with wardrobe tab screen with refresh flag
      router.replace({
        pathname: '/(protected)/(tabs)/wardrobe',
        params: { refresh: 'true' }
      });
    } catch (error: any) {
      console.error('Garment creation error:', error);
      Alert.alert('Error', error.message || 'Failed to save garment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake the picture
  const retakePicture = () => {
    setCapturedImage(null);
  };

  // Go back to garments list
  const goBack = () => {
    router.replace('/(protected)/(tabs)/wardrobe');
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <View style={styles.container}>
        {capturedImage ? (
          // Preview captured image
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.preview} />
            
            {isProcessing ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#00FF77" />
                <Text style={styles.loadingText}>Saving garment...</Text>
              </View>
            ) : (
              <SafeAreaView style={styles.previewControls}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={retakePicture}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={saveGarment}
                >
                  <Text style={styles.confirmText}>Save to Wardrobe</Text>
                </TouchableOpacity>
              </SafeAreaView>
            )}
          </View>
        ) : (
          // Camera view
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              flash={flash}
            />
            
            <SafeAreaView style={styles.controls}>
              <View style={styles.topControls}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={goBack}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={toggleFlash}
                >
                  <Ionicons 
                    name={flash === 'on' ? 'flash' : 'flash-off'} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.bottomControls}>
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#00FF77',
    borderRadius: 8,
  },
  confirmText: {
    color: 'black',
    fontFamily: 'RobotoMono-Regular',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginTop: 16,
    fontSize: 16,
  },
}); 