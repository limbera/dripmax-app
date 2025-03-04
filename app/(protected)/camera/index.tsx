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
  SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../../utils/logger';
import { useOutfitStore } from '../../../stores/outfitStore';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../../services/supabase';
import * as FileSystem from 'expo-file-system';
import * as base64 from 'base64-js';
import { nanoid } from 'nanoid/non-secure';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Create an animated version of the SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const cameraLogger = {
  info: (message: string, data?: any) => logger.info(`[Camera] ${message}`, data),
  error: (message: string, data?: any) => logger.error(`[Camera] ${message}`, data),
};

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  
  const cameraRef = useRef(null);
  const router = useRouter();
  const { addOutfit, getOutfitWithFeedback } = useOutfitStore();
  const progressAnimation = useRef(new Animated.Value(0)).current;

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
    cameraLogger.info('Camera facing switched', { facing: cameraFacing === 'back' ? 'front' : 'back' });
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      const newMode = current === 'off' ? 'on' : 'off';
      cameraLogger.info('Flash mode switched', { mode: newMode });
      return newMode;
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      cameraLogger.info('Taking picture...');
      setIsCapturing(true);
      
      // @ts-ignore - Needed because of typing issues with the camera ref
      const photo = await cameraRef.current.takePictureAsync({
        exif: false,
      });
      
      cameraLogger.info('Photo captured', { 
        hasUri: !!photo?.uri,
        width: photo?.width,
        height: photo?.height,
        uri: photo?.uri?.substring(0, 30) + '...'
      });
      
      // Directly set the captured image without any manipulation
      if (photo.uri) {
        setCapturedImage(photo.uri);
        cameraLogger.info('Photo set to state', { uri: photo.uri.substring(0, 30) + '...' });
      } else {
        throw new Error('Photo URI is missing');
      }
    } catch (error) {
      cameraLogger.error('Failed to take picture', { 
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const analyzeDrip = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'No image captured. Please take a photo first.');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      
      // Start progress animation
      setProgress(0);
      progressAnimation.setValue(0);
      
      // Set up progress tracking with more fine-grained updates
      const updateProgress = (value: number, message: string) => {
        setProgress(value);
        cameraLogger.info(`Analysis progress: ${message} (${value}%)`, { progress: value });
      };
      
      // Phase 1: Prepare upload (0-10%)
      updateProgress(5, 'Preparing upload');
      
      // Phase 2: Upload image (10-35%)
      updateProgress(10, 'Uploading image');
      const imageUrl = await uploadImage(capturedImage);
      
      if (!imageUrl) {
        throw new Error('Failed to upload image');
      }
      
      updateProgress(35, 'Image uploaded successfully');
      
      // Phase 3: Create outfit record (35-50%)
      updateProgress(40, 'Creating outfit record');
      const newOutfitId = await addOutfit(imageUrl);
      
      if (!newOutfitId) {
        throw new Error('Failed to create outfit record');
      }
      
      setOutfitId(newOutfitId);
      updateProgress(50, 'Outfit record created');
      
      // Phase 4: Poll for feedback with incremental progress (50-95%)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      let feedback = null;
      
      // Calculate progress increment per poll attempt
      const progressPerAttempt = Math.floor(45 / maxAttempts);
      
      while (!feedback && attempts < maxAttempts) {
        attempts++;
        updateProgress(
          Math.min(50 + (attempts * progressPerAttempt), 95),
          `Analyzing outfit (attempt ${attempts}/${maxAttempts})`
        );
        
        try {
          const outfit = await getOutfitWithFeedback(newOutfitId);
          
          if (outfit?.feedback && outfit.feedback.overall_feedback) {
            feedback = outfit.feedback;
            updateProgress(95, 'Analysis complete!');
            break;
          }
        } catch (error) {
          cameraLogger.error('Error polling for feedback', { 
            error: error instanceof Error ? error.message : String(error),
            attempt: attempts
          });
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Phase 5: Complete and navigate (95-100%)
      updateProgress(100, 'Ready');
      
      // Navigate to outfit detail with a short delay for UX
      setTimeout(() => {
        navigateToOutfitDetail(newOutfitId);
      }, 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      cameraLogger.error('Failed to analyze outfit', { 
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('Error', errorMessage);
      setIsAnalyzing(false);
    }
  };

  // Function to upload an image to Supabase Storage
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      if (!uri || !uri.startsWith('file://')) {
        throw new Error('Invalid image URI');
      }
      
      // Generate a unique file name with timestamp
      const timestamp = new Date().getTime();
      const fileName = `outfit-${timestamp}.jpg`;
      cameraLogger.info('Preparing to upload image', { fileName });
      
      // Read image as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Use FileReader to create base64 data - this approach is more reliable
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          if (!reader.result) {
            reject(new Error('FileReader returned empty result'));
            return;
          }
          
          const base64String = reader.result as string;
          // Extract just the base64 data part (remove the data URI prefix)
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        
        reader.onerror = (error) => {
          cameraLogger.error('FileReader error', { error });
          reject(new Error('Failed to read image data'));
        };
        
        reader.readAsDataURL(blob);
      });
      
      cameraLogger.info('Image converted to base64 successfully', {
        dataLength: base64Data.length
      });
      
      // Convert base64 to binary data for upload
      const binaryData = base64.toByteArray(base64Data);
      
      // Upload the binary data to Supabase
      cameraLogger.info('Uploading image to Supabase storage', {
        bucket: 'outfits',
        fileSize: binaryData.length
      });
      
      const { data, error } = await supabase.storage
        .from('outfits')
        .upload(fileName, binaryData, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (error) {
        cameraLogger.error('Supabase upload error', { error: error.message });
        throw error;
      }
      
      if (!data || !data.path) {
        throw new Error('Upload succeeded but returned no path');
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('outfits')
        .getPublicUrl(data.path);
      
      cameraLogger.info('Upload completed successfully', { publicUrl });
      return publicUrl;
      
    } catch (error) {
      cameraLogger.error('Image upload failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      
      Alert.alert(
        'Upload Failed', 
        'There was a problem uploading the image. Please try again.'
      );
      
      return null;
    }
  };

  const navigateToOutfitDetail = (id: string) => {
    setIsAnalyzing(false);
    
    // Replace the current screen in the navigation history
    // so that back button from detail goes to home, not camera
    router.replace({
      pathname: "/outfit/[id]",
      params: { id, fromCamera: "true" }
    });
    
    cameraLogger.info('Replacing current screen with outfit detail', { outfitId: id });
  };

  const startProgressAnimation = () => {
    // This function is no longer used for automatic progress
    // as we're now directly setting progress values based on actual progress
    // But we'll keep it for fallback or testing purposes
    
    // Reset progress
    setProgress(0);
    progressAnimation.setValue(0);
    
    // Animate from 0 to 90% over a longer period (used only as fallback)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 1;
      });
    }, 300); // Slower animation as fallback
    
    // Return cleanup function
    return () => clearInterval(interval);
  };
  
  // Update subtext based on progress
  const getAnalysisText = () => {
    if (progress < 10) {
      return "Preparing your outfit photo...";
    } else if (progress < 35) {
      return "Uploading to our AI...";
    } else if (progress < 50) {
      return "Creating outfit record...";
    } else if (progress < 75) {
      return "Analyzing style elements...";
    } else if (progress < 90) {
      return "Generating fashion feedback...";
    } else if (progress < 100) {
      return "Finalizing analysis...";
    } else {
      return "Ready!";
    }
  };
  
  useEffect(() => {
    // Animate the progress value
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const resetCamera = () => {
    // Clear captured image to return to camera mode
    setCapturedImage(null);
    
    // Reset any ongoing analysis
    setIsAnalyzing(false);
    setProgress(0);
    
    cameraLogger.info('Camera reset, returning to capture mode');
  };

  const goBackToHome = () => {
    // Navigate back to home page
    router.back();
    cameraLogger.info('Navigating back to home screen');
  };

  // Loading state while checking permissions
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Loading camera...</Text>
      </View>
    );
  }

  // Permission denied - render a blank screen while the navigation effect takes place
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // CAMERA PREVIEW VIEW
  if (!capturedImage) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        <CameraView
          style={styles.camera}
          facing={cameraFacing}
          flash={flashMode}
          // @ts-ignore
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            {/* Top row controls */}
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={styles.circleButton} 
                onPress={toggleFlash}
              >
                <Ionicons 
                  name={flashMode === 'on' ? 'flash' : 'flash-off'} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.circleButton} 
                onPress={goBackToHome}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* Bottom row controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity 
                style={styles.circleButton}
                onPress={() => {}}
              >
                <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.captureContainer}>
                <TouchableOpacity 
                  style={[
                    styles.captureButton,
                    isCapturing && styles.captureButtonDisabled
                  ]}
                  onPress={takePicture}
                  disabled={isCapturing}
                >
                  <View style={[
                    styles.captureButtonInner,
                    isCapturing && styles.captureButtonInnerDisabled
                  ]} />
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
        </CameraView>
      </View>
    );
  }
  
  // ANALYSIS LOADING VIEW
  if (isAnalyzing) {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const strokeDashoffset = progressAnimation.interpolate({
      inputRange: [0, 100],
      outputRange: [circumference, 0],
    });
    
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        
        <View style={styles.analyzeContainer}>
          <View style={styles.progressContainer}>
            <Svg width={size} height={size}>
              {/* Background Circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#333333"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress Circle */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#00FF77"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <Text style={styles.progressText}>
              {Math.round(progress)}%
            </Text>
          </View>
          
          <Text style={styles.analyzeText}>Analyzing your drip...</Text>
          <Text style={styles.subText}>{getAnalysisText()}</Text>
        </View>
      </View>
    );
  }
  
  // IMAGE PREVIEW VIEW
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      
      {/* Original preview container */}
      <View style={styles.previewContainer}>
        {capturedImage ? (
          <Image 
            source={{ uri: capturedImage }}
            style={styles.previewImage}
            resizeMode="contain"
            onLoadStart={() => cameraLogger.info('Preview image load started')}
            onLoad={() => cameraLogger.info('Preview image loaded successfully')}
            onError={(e) => cameraLogger.error('Preview image load failed', { 
              error: e.nativeEvent.error,
              uri: capturedImage.substring(0, 20) + '...'
            })}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Image not available</Text>
          </View>
        )}
      </View>
      
      {/* Transparent top panel for buttons positioned to match camera view */}
      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
        }}
        pointerEvents="box-none"
      >
        <View style={[styles.topControls, { backgroundColor: 'transparent' }]}>
          {/* Empty space with same dimensions as flash button */}
          <View style={{ width: 45, opacity: 0 }} />
          
          <TouchableOpacity 
            style={styles.circleButton} 
            onPress={resetCamera}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.analyzeButton}
        onPress={analyzeDrip}
      >
        <Text style={styles.analyzeText}>NEXT</Text>
        <View style={styles.iconContainer}>
          <Ionicons name="chevron-forward-outline" size={24} color="black" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
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
  captureButtonDisabled: {
    borderColor: 'gray',
  },
  captureButtonInnerDisabled: {
    backgroundColor: 'gray',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
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
  },
  analyzeText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  iconContainer: {
    position: 'absolute',
    right: 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  analyzeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressText: {
    position: 'absolute',
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },
  subText: {
    fontSize: 16,
    color: '#aaaaaa',
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#aaaaaa',
    fontSize: 16,
  },
}); 