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
  Animated,
  SafeAreaView,
  Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cameraLogger } from '../../utils/logger';
import { useOutfitStore } from '../../stores/outfitStore';
import Svg, { Circle } from 'react-native-svg';
import { uploadOutfitImage } from '../../services/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FaceDetector from 'expo-face-detector';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Create an animated version of the SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function OutfitCameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<any>(null);
  
  // Store access
  const { addOutfit } = useOutfitStore();

  // Animated values
  const scanLineY = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);

  // Effect to check permissions
  useEffect(() => {
    (async () => {
      const { granted } = await requestPermission();
      if (!granted) {
        router.back();
      }
    })();
  }, []);

  // Toggle camera between front and back
  const toggleCameraFacing = () => {
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  // Toggle flash
  const toggleFlash = () => {
    setFlash(flash === 'off' ? 'on' : 'off');
  };

  // Detect if multiple people are in the photo
  const detectMultiplePeople = async (uri: string): Promise<boolean> => {
    try {
      const options = {
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
      };

      const result = await FaceDetector.detectFacesAsync(uri, options);
      
      // If more than one face detected, return true
      if (result.faces.length > 1) {
        cameraLogger.info('Multiple faces detected', { count: result.faces.length });
        return true;
      }
      
      return false;
    } catch (error) {
      cameraLogger.error('Error detecting faces', { error });
      return false;
    }
  };

  // Take a picture with the camera
  const takePicture = async () => {
    if (!camera.current) return;
    
    try {
      const photo = await camera.current.takePictureAsync();
      
      // Check for multiple faces
      const hasMultiplePeople = await detectMultiplePeople(photo.uri);
      if (hasMultiplePeople) {
        Alert.alert(
          "Multiple People Detected",
          "Please ensure only you are in the photo for accurate outfit analysis.",
          [
            { text: "Retake Photo", onPress: () => {} }
          ]
        );
        return;
      }
      
      // Compress and resize the image
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      setCapturedImage(manipResult.uri);
      
    } catch (error) {
      cameraLogger.error('Error taking picture', { error });
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Analyze the outfit image
  const analyzeOutfit = async () => {
    if (!capturedImage) return;
    
    startProgressAnimation();
    setAnalyzing(true);
    setError(null);
    
    try {
      // Start the analysis
      setProgressMessage('Starting analysis...');
      updateProgress(0.1, 'Uploading image...');
      
      // Upload the image first
      const imageUrl = await uploadOutfitImage(capturedImage);
      setUploadedUrl(imageUrl);
      
      if (!imageUrl) {
        throw new Error('Failed to upload image');
      }
      
      updateProgress(0.4, 'Analyzing your outfit...');
      
      // Add the outfit to the store (which saves to Supabase)
      const outfitId = await addOutfit(imageUrl);
      
      if (!outfitId) {
        throw new Error('Failed to create outfit record');
      }
      
      updateProgress(0.9, 'Processing complete!');
      
      // Navigate to the outfit detail screen
      setTimeout(() => {
        navigateToOutfitDetail(outfitId);
      }, 500);
      
    } catch (err: any) {
      cameraLogger.error('Error analyzing outfit', { error: err.message });
      setError(`Failed to process image: ${err.message}`);
      setAnalyzing(false);
    }
  };

  // Start the analysis workflow
  const startAnalysis = async () => {
    await analyzeOutfit();
  };

  // Update progress value and message
  const updateProgress = (value: number, message: string) => {
    progressValue.current = value;
    Animated.timing(progressAnimation, {
      toValue: value,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
    setProgress(value);
    setProgressMessage(message);
  };
  
  // Navigate to outfit detail screen
  const navigateToOutfitDetail = (id: string) => {
    // Reset state
    setAnalyzing(false);
    setCapturedImage(null);
    setUploadedUrl(null);
    
    // Navigate to detail screen
    router.push(`/outfit/${id}`);
  };
  
  // Start the progress animation
  const startProgressAnimation = () => {
    progressValue.current = 0;
    setProgress(0);
    progressAnimation.setValue(0);
  };
  
  // Reset the camera
  const resetCamera = () => {
    setCapturedImage(null);
    setAnalyzing(false);
    setError(null);
    setUploadedUrl(null);
  };
  
  // Go back to home screen
  const goBackToHome = () => {
    router.push('/(tabs)/home');
  };
  
  // Animate the scan line for a visual effect
  const animateScanLine = () => {
    scanLineY.setValue(0);
    Animated.loop(
      Animated.timing(scanLineY, {
        toValue: SCREEN_HEIGHT - 200,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  };

  // Start scan line animation when screen mounts
  useEffect(() => {
    animateScanLine();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "Capture Outfit",
          headerStyle: {
            backgroundColor: 'black',
          },
          headerTintColor: 'white',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBackToHome}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <StatusBar barStyle="light-content" />
      
      {!capturedImage ? (
        // Camera view for taking a photo
        <View style={styles.cameraContainer}>
          <CameraView
            ref={camera}
            style={styles.camera}
            facing={facing}
            flash={flash}
          >
            {/* Overlay with camera UI */}
            <View style={styles.overlay}>
              {/* Scan line animation */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineY }],
                  },
                ]}
              />
              
              {/* Camera controls */}
              <View style={styles.controls}>
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
                  <Ionicons name="camera-reverse-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
          
          {/* Instructions overlay */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Position your full outfit in frame
            </Text>
          </View>
        </View>
      ) : (
        // Preview and analysis screen
        <View style={styles.previewContainer}>
          {/* Display captured image */}
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          {analyzing ? (
            // Analysis in progress UI
            <View style={styles.analysisOverlay}>
              <View style={styles.progressContainer}>
                {/* Progress indicator */}
                <Svg width="120" height="120" viewBox="0 0 100 100">
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#555"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <AnimatedCircle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#00FF77"
                    strokeWidth="7"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={
                      progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2 * Math.PI * 45, 0],
                      }) as any
                    }
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={styles.progressPercentage}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <Text style={styles.analysisText}>{progressMessage}</Text>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={resetCamera}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            // Confirmation UI
            <View style={styles.confirmationOverlay}>
              <Text style={styles.confirmationTitle}>
                {analyzing ? "Analyzing Outfit..." : "Submit for Analysis?"}
              </Text>
              
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.cancelButton]}
                  onPress={resetCamera}
                >
                  <Text style={styles.confirmationButtonText}>Retake</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.confirmButton]}
                  onPress={startAnalysis}
                >
                  <Text style={styles.confirmationButtonText}>
                    Analyze
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#00FF77',
    opacity: 0.5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    position: 'absolute',
    color: '#00FF77',
    fontSize: 24,
    fontFamily: 'RobotoMono-Regular',
  },
  analysisText: {
    marginTop: 20,
    color: 'white',
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF385C',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
    marginHorizontal: 40,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF385C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
  },
  confirmationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  confirmationTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
    marginBottom: 30,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  confirmationButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 130,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  confirmButton: {
    backgroundColor: '#00FF77',
  },
  confirmationButtonText: {
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
    color: 'black',
    fontWeight: 'bold',
  },
}); 