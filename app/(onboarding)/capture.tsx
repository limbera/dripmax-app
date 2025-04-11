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
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FaceDetector from 'expo-face-detector';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { usePendingImageStore } from '../../stores/pendingImageStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const cameraRef = useRef(null);
  const router = useRouter();
  const pendingImageStore = usePendingImageStore();

  // Automatically request permission when component mounts
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Handle navigation when permission is denied
  useEffect(() => {
    if (permission && !permission.granted) {
      router.back();
    }
  }, [permission, router]);

  const toggleCameraFacing = () => {
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
  };

  const toggleFlash = () => {
    setFlashMode(current => !current);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setCapturedImage(selectedImage.uri);
        console.log('Image selected from library:', selectedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image from library.');
    }
  };

  const detectMultiplePeople = async (uri: string): Promise<boolean> => {
    try {
      console.log('Detecting multiple people in image');
      
      // Process the image to ensure it's in a format FaceDetector can handle
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }], // Resize for better performance
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Use the face detector to find faces in the image
      const result = await FaceDetector.detectFacesAsync(processedImage.uri, {
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
        minDetectionInterval: 0,
      });
      
      // Clean up the processed image to save space
      if (processedImage.uri !== uri) {
        await FileSystem.deleteAsync(processedImage.uri, { idempotent: true })
          .catch(err => console.error('Failed to delete temporary image', err));
      }
      
      // Check if multiple faces were detected (more than 1 face)
      const hasMultiple = result.faces.length > 1;
      console.log(`Face detection complete: ${result.faces.length} faces found`);
      return hasMultiple;
      
    } catch (error) {
      console.error('Error detecting faces', error);
      // In case of error, assume it's okay to proceed
      return false;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      console.log('Taking picture...');
      setIsCapturing(true);
      
      // @ts-ignore - Needed because of typing issues with the camera ref
      const photo = await cameraRef.current.takePictureAsync({
        exif: false,
      });
      
      console.log('Photo captured');
      
      // Directly set the captured image without any manipulation
      if (photo.uri) {
        setCapturedImage(photo.uri);
        console.log('Photo set to state');
      } else {
        throw new Error('Photo URI is missing');
      }
    } catch (error) {
      console.error('Failed to take picture', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'No image captured. Please take a photo first.');
      return;
    }
    
    try {
      // Check for multiple people before proceeding
      const hasMultiplePeople = await detectMultiplePeople(capturedImage);
      
      if (hasMultiplePeople) {
        // Show alert to user
        Alert.alert(
          "Multiple People Detected",
          "We detected more than one person in your photo. For best results, please take a photo with just yourself.",
          [
            {
              text: "Retry",
              onPress: () => {
                // Reset camera to take a new photo
                setCapturedImage(null);
              },
              style: "cancel"
            },
            {
              text: "Continue Anyway",
              onPress: () => {
                // Save the image to pendingImageStore before navigating
                pendingImageStore.setPendingImage(capturedImage);
                // Navigate directly to scanning
                router.push({
                  pathname: "/(onboarding)/scanning",
                  params: { image: capturedImage }
                });
              }
            }
          ]
        );
      } else {
        // No multiple people detected, proceed directly to scanning
        // Save the image to pendingImageStore before navigating
        pendingImageStore.setPendingImage(capturedImage);
        router.push({
          pathname: "/(onboarding)/scanning",
          params: { image: capturedImage }
        });
      }
    } catch (error) {
      console.error('Failed during image processing', error);
      Alert.alert('Error', 'Processing failed. Please try again.');
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
  };

  // If camera permission is still loading
  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={{ color: 'white', marginTop: 20 }}>Requesting camera permission...</Text>
      </View>
    );
  }

  // If image is captured, show preview with Next button
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Image Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          {/* Close button at top right */}
          <TouchableOpacity
            style={[styles.controlButton, styles.closeButton]}
            onPress={resetCamera}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Next button at bottom - matching the style of ActionButton in the real app */}
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={handleConfirm}
          >
            <Text style={styles.analyzeText}>NEXT</Text>
            <View style={styles.iconContainer}>
              <Ionicons name="chevron-forward" size={24} color="black" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera View (show only if no image is captured) */}
      {!isCameraReady && (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#00FF77" />
          <Text style={{ color: 'white', marginTop: 20 }}>Initializing camera...</Text>
        </View>
      )}
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        flash={flashMode ? 'on' : 'off'}
        onCameraReady={() => setIsCameraReady(true)}
      >
        {/* Simplified overlay with just the silhouette image */}
        <View style={styles.centerSilhouette}>
          {/* Silhouette image centered */}
          <Image 
            source={require('../../assets/images/silhouette-overlay.png')} 
            style={styles.silhouetteImage}
            resizeMode="contain"
          />
          
          {/* Guide text placed at bottom */}
          <Text style={styles.guideText}>Take a photo of your outfit</Text>
        </View>
        
        {/* Camera Controls */}
        <SafeAreaView style={styles.controls}>
          {/* Top controls row */}
          <View style={styles.topControlsRow}>
            {/* Flash toggle - Left */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFlash}
            >
              <Ionicons 
                name={flashMode ? 'flash' : 'flash-off'} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            {/* Close button - Right */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Bottom controls row */}
          <View style={styles.bottomControlsRow}>
            {/* Camera roll button - Left */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pickImage}
            >
              <Ionicons name="images-outline" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Capture Button - Center */}
            <TouchableOpacity
              disabled={isCapturing}
              style={styles.captureButton}
              onPress={takePicture}
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#00FF77" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
            
            {/* Camera flip - Right */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="sync-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
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
    flex: 1,
    justifyContent: 'space-between',
  },
  topControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'white',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  analyzeButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#00FF77',
    padding: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    flexDirection: 'row',
  },
  analyzeText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'absolute',
    right: 25,
  },
  // Frame overlay styles
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  middleSection: {
    flexDirection: 'row',
    height: SCREEN_WIDTH * 1.33, // Aspect ratio 3:4
  },
  silhouetteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove any horizontal padding
  },
  silhouetteImage: {
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 1.35,
    opacity: 0.5,
    transform: [{ translateY: -50 }],
  },
  guideText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    fontFamily: 'RobotoMono-Regular',
    position: 'absolute',
    bottom: 20,
    zIndex: 10,
  },
  centerSilhouette: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}); 