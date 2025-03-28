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
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { createGarment } from '../../../services/supabase';

// Get window dimensions
const { width, height } = Dimensions.get('window');
// Make the frame size a rectangle that's better for clothing items
const FRAME_WIDTH = Math.min(width, height) * 0.7;
const FRAME_HEIGHT = FRAME_WIDTH * 1.5; // 50% taller than it is wide

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
        
        // Just compress the image without cropping it to preserve the full photo
        // The frame serves as a guide but we keep the entire image
        const compressedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            // No cropping operation, just resize to a reasonable resolution
            { resize: { width: 1080 } }
          ],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        setCapturedImage(compressedImage.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    }
  };

  // Function to pick image from gallery
  const pickImage = async () => {
    try {
      // Request permission if needed
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select images.'
        );
        return;
      }
      
      // Launch image picker without forcing an aspect ratio
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // No aspect ratio constraint to allow natural photos
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Set the captured image state with the picked image
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
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
      
      // Navigate back with refresh parameter
      // We need to pass this parameter to trigger a reload in the wardrobe screen
      router.navigate({
        pathname: "/(protected)/(tabs)/wardrobe",
        params: { refresh: 'true' }
      });
      
      // Show a success message
      Alert.alert(
        'Garment Added',
        'Your garment has been successfully added to your wardrobe.',
        [{ text: 'OK' }]
      );
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
    router.back();
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
                <Text style={styles.loadingText}>Analyzing garment with AI...</Text>
                <Text style={styles.loadingSubtext}>This may take a moment</Text>
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
                  <Text style={styles.confirmText}>Analyze & Save</Text>
                </TouchableOpacity>
              </SafeAreaView>
            )}
          </View>
        ) : (
          // Camera view with rectangular overlay
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              flash={flash}
              zoom={0}
            />
            
            {/* Overlay with cutout for the rectangular frame */}
            <View style={styles.overlay}>
              {/* Top overlay */}
              <View style={styles.overlaySection} />
              
              {/* Middle section with cutout */}
              <View style={styles.middleSection}>
                {/* Left overlay */}
                <View style={styles.overlaySection} />
                
                {/* Transparent rectangular cutout */}
                <View style={styles.frame}>
                  {/* Guide text */}
                  <Text style={styles.guideText}>Place garment in frame</Text>
                </View>
                
                {/* Right overlay */}
                <View style={styles.overlaySection} />
              </View>
              
              {/* Bottom overlay */}
              <View style={styles.overlaySection} />
            </View>
            
            <View style={styles.cameraControls}>
              {/* Top row controls */}
              <View style={styles.topControls}>
                <TouchableOpacity 
                  style={styles.circleButton} 
                  onPress={toggleFlash}
                >
                  <Ionicons 
                    name={flash === 'on' ? 'flash' : 'flash-off'} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.circleButton} 
                  onPress={goBack}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Bottom row controls */}
              <View style={styles.bottomControls}>
                <TouchableOpacity 
                  style={styles.circleButton}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.captureContainer}>
                  <TouchableOpacity 
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.circleButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="sync-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleSection: {
    width: '100%',
    height: FRAME_HEIGHT,
    flexDirection: 'row',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
  guideText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cameraControls: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 50 : 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  circleButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'white',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 100,
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
  loadingSubtext: {
    color: '#AAAAAA',
    fontFamily: 'RobotoMono-Regular',
    marginTop: 8,
    fontSize: 14,
  },
}); 