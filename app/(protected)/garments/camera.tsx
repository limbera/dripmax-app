import React, { useState, useRef, useEffect } from 'react';
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
import { CameraView, useCameraPermissions, FlashMode, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeAndCreateGarment } from '../../../services/supabase';

// Constants for aspect ratio calculations
const ASPECT_RATIOS = {
  'square': 1,     // 1:1
  'standard': 4/3,  // 4:3 (changed from 16:9)
};

export default function GarmentCameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // New state for aspect ratio, with only two options now
  const [aspectRatio, setAspectRatio] = useState<'square' | 'standard'>('standard');
  const [screenDimensions, setScreenDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription.remove();
  }, []);

  // Request camera permissions if not already granted
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Toggle between front and back camera
  const toggleCameraFacing = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  // Toggle flash mode
  const toggleFlash = () => {
    setFlash(flash === 'off' ? 'on' : 'off');
  };

  // Take a picture with current aspect ratio
  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync();
      
      // Check if photo is undefined
      if (!photo || !photo.uri) {
        throw new Error("Failed to capture photo");
      }
      
      // Process the photo to match the selected aspect ratio
      const originalAspectRatio = photo.width / photo.height;
      const targetAspectRatio = ASPECT_RATIOS[aspectRatio];
      
      let cropConfig;
      if (originalAspectRatio > targetAspectRatio) {
        // Original is wider, crop width
        const newWidth = photo.height * targetAspectRatio;
        const offsetX = (photo.width - newWidth) / 2;
        cropConfig = {
          originX: offsetX,
          originY: 0,
          width: newWidth,
          height: photo.height
        };
      } else {
        // Original is taller, crop height
        const newHeight = photo.width / targetAspectRatio;
        const offsetY = (photo.height - newHeight) / 2;
        cropConfig = {
          originX: 0,
          originY: offsetY,
          width: photo.width,
          height: newHeight
        };
      }
      
      const processedPhoto = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: cropConfig }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      setCapturedImage(processedPhoto.uri);
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // Save the garment to Supabase
  const saveGarment = async () => {
    if (!capturedImage) return;
    
    try {
      setIsProcessing(true);
      
      // Show a longer message since the AI analysis takes time
      Alert.alert(
        'Processing',
        'Analyzing your garment with AI. This may take up to 30 seconds...',
        [],
        { cancelable: false }
      );
      
      // Call the new Edge Function for AI analysis and garment creation
      const { garment, error } = await analyzeAndCreateGarment(capturedImage);
      
      if (error) {
        console.error('Error analyzing and creating garment:', error);
        
        // Check for common errors and provide user-friendly messages
        let errorMessage = 'Failed to save garment. Please try again.';
        
        if (error.message?.includes('too large')) {
          errorMessage = 'The image is too large. Please try again with a smaller or lower quality photo.';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message?.includes('authenticate')) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Could add navigation to login screen here if needed
        }
        
        Alert.alert('Error', errorMessage);
        throw error;
      }
      
      // No need to dismiss the alert - React Native's Alert gets dismissed automatically
      
      // Show success message
      Alert.alert(
        'Success!',
        'Your garment has been analyzed and added to your wardrobe.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Replace current screen with wardrobe tab screen with refresh flag
              router.replace({
                pathname: '/(protected)/(tabs)/wardrobe',
                params: { refresh: 'true' }
              });
            }
          }
        ]
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
    router.replace('/(protected)/(tabs)/wardrobe');
  };

  // Handle aspect ratio change
  const changeAspectRatio = (newRatio: 'square' | 'standard') => {
    setAspectRatio(newRatio);
  };

  // Calculate camera dimensions based on aspect ratio and screen size
  const getCameraContainerStyle = () => {
    const { width, height } = screenDimensions;
    const maxHeight = height - 200; // Leave space for controls
    
    if (aspectRatio === 'square') {
      // For square, use the smaller dimension
      const size = Math.min(width, maxHeight);
      return {
        width: size,
        height: size,
        overflow: 'hidden' as const
      };
    } else {
      // For 4:3 (standard)
      const targetHeight = width / ASPECT_RATIOS[aspectRatio];
      const containerHeight = Math.min(targetHeight, maxHeight);
      const containerWidth = containerHeight * ASPECT_RATIOS[aspectRatio];
      
      return {
        width: containerWidth,
        height: containerHeight,
        overflow: 'hidden' as const
      };
    }
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
            {/* Camera container with aspect ratio */}
            <View style={styles.cameraOuterContainer}>
              <View style={[
                styles.cameraContainer, 
                getCameraContainerStyle()
              ]}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing={cameraType}
                  flash={flash}
                />
              </View>
            </View>
            
            <SafeAreaView style={styles.controls}>
              <View style={styles.topControls}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={goBack}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.bottomSection}>
                {/* Aspect Ratio Controls - Now placed just above bottom controls */}
                <View style={styles.aspectRatioControls}>
                  <TouchableOpacity 
                    style={[styles.aspectRatioPill, aspectRatio === 'square' && styles.aspectRatioPillSelected]}
                    onPress={() => changeAspectRatio('square')}
                  >
                    <Text style={[styles.aspectRatioText, aspectRatio === 'square' && styles.aspectRatioTextSelected]}>Square</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.aspectRatioPill, aspectRatio === 'standard' && styles.aspectRatioPillSelected]}
                    onPress={() => changeAspectRatio('standard')}
                  >
                    <Text style={[styles.aspectRatioText, aspectRatio === 'standard' && styles.aspectRatioTextSelected]}>Standard</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.bottomControls}>
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
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={toggleCameraFacing}
                  >
                    <Ionicons name="camera-reverse" size={24} color="white" />
                  </TouchableOpacity>
                </View>
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
  cameraOuterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  cameraContainer: {
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
    justifyContent: 'flex-start',
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 40 : 16,
  },
  bottomSection: {
    // Container for both aspect ratio controls and bottom controls
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  aspectRatioControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  aspectRatioPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  aspectRatioPillSelected: {
    backgroundColor: '#00FF77',
    borderColor: '#00FF77',
  },
  aspectRatioText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
  },
  aspectRatioTextSelected: {
    color: 'black',
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#00FF77',
  },
  confirmText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
}); 