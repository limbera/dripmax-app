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
import { logger } from '../../../utils/logger';
import { useOutfitStore } from '../../../stores/outfitStore';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../../services/supabase';
import * as FileSystem from 'expo-file-system';
import * as base64 from 'base64-js';
import { nanoid } from 'nanoid/non-secure';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FaceDetector from 'expo-face-detector';
import * as ImagePicker from 'expo-image-picker';
import ActionButton from '../../../components/ActionButton';
import { usePendingImageStore } from '../../../stores/pendingImageStore';

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
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  const { pendingImageUri, clearPendingImage } = usePendingImageStore();

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

  // Check for pending image from onboarding when component mounts
  useEffect(() => {
    if (pendingImageUri) {
      cameraLogger.info('Found pending image from onboarding', { 
        pendingImageUri: pendingImageUri.substring(0, 30) + '...' 
      });
      
      // Set the pending image as the captured image
      setCapturedImage(pendingImageUri);
      
      // Clear the pending image to avoid reloading it if user navigates away
      clearPendingImage();
    }
  }, [pendingImageUri, clearPendingImage]);

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

  const detectMultiplePeople = async (uri: string): Promise<boolean> => {
    try {
      cameraLogger.info('Detecting multiple people in image');
      
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
          .catch(err => cameraLogger.error('Failed to delete temporary image', { error: err }));
      }
      
      // Check if multiple faces were detected (more than 1 face)
      const hasMultiple = result.faces.length > 1;
      cameraLogger.info(`Face detection complete: ${result.faces.length} faces found`);
      return hasMultiple;
      
    } catch (error) {
      cameraLogger.error('Error detecting faces', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      // In case of error, assume it's okay to proceed
      return false;
    }
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
      // Check for multiple people before starting analysis
      if (!capturedImage) {
        throw new Error('No image captured');
      }
      
      const hasMultiplePeople = await detectMultiplePeople(capturedImage as string);
      
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
                resetCamera();
              },
              style: "cancel"
            },
            {
              text: "Continue Anyway",
              onPress: () => {
                // Continue with analysis as normal
                startAnalysis();
              }
            }
          ]
        );
      } else {
        // No multiple people detected, proceed normally
        startAnalysis();
      }
    } catch (error) {
      cameraLogger.error('Failed during analysis', { 
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert('Error', 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Start progress animation
    setProgress(0);
    progressAnimation.setValue(0);
    
    // Set up progress tracking with more fine-grained updates
    const updateProgress = (value: number, message: string) => {
      setProgress(value);
      cameraLogger.info(`Analysis progress: ${message} (${value}%)`, { progress: value });
    };
    
    try {
      if (!capturedImage) {
        throw new Error('No image captured');
      }
      
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
  const uploadImage = async (uri: string | null): Promise<string | null> => {
    try {
      if (!uri || !uri.startsWith('file://')) {
        throw new Error('Invalid image URI');
      }
      
      // Generate a unique file name with timestamp
      const timestamp = new Date().getTime();
      const fileName = `outfit-${timestamp}.jpg`;
      cameraLogger.info('Preparing to upload image', { fileName });
      
      // Compress the image before uploading to reduce size
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize to max width of 1200px
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
      );
      
      cameraLogger.info('Image compressed successfully', {
        originalUri: uri.substring(0, 30) + '...',
        compressedUri: compressedImage.uri.substring(0, 30) + '...',
        width: compressedImage.width,
        height: compressedImage.height,
      });
      
      // Read image as blob
      const response = await fetch(compressedImage.uri);
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
      
      // Try upload with retry logic
      let uploadAttempt = 0;
      const maxUploadAttempts = 3;
      let uploadResult = null;
      
      while (uploadAttempt < maxUploadAttempts) {
        uploadAttempt++;
        
        try {
          const { data, error } = await supabase.storage
            .from('outfits')
            .upload(fileName, binaryData, {
              contentType: 'image/jpeg',
              upsert: true
            });
          
          if (error) {
            // Check if error contains HTML (indicating a server error)
            const errorString = String(error);
            if (errorString.includes('JSON Parse error') || errorString.includes('<')) {
              cameraLogger.error(`Supabase upload attempt ${uploadAttempt} failed with HTML response`, { 
                error: errorString
              });
              
              if (uploadAttempt < maxUploadAttempts) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, uploadAttempt * 1000));
                continue;
              }
            }
            
            cameraLogger.error('Supabase upload error', { error: error.message });
            throw error;
          }
          
          uploadResult = data;
          break;
        } catch (e) {
          cameraLogger.error(`Upload attempt ${uploadAttempt} failed`, { 
            error: e instanceof Error ? e.message : String(e)
          });
          
          if (uploadAttempt >= maxUploadAttempts) {
            throw e;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, uploadAttempt * 1000));
        }
      }
      
      if (!uploadResult || !uploadResult.path) {
        throw new Error('Upload succeeded but returned no path');
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('outfits')
        .getPublicUrl(uploadResult.path);
      
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
      return "Preparing outfit photo...";
    } else if (progress < 35) {
      return "Uploading to  AI...";
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
    router.back();
    cameraLogger.info('Going back to previous screen');
  };

  // Add this function to create the scanning line animation
  const animateScanLine = () => {
    // Reset to start position if needed
    scanLinePosition.setValue(0);
    
    // Create a sequence of animations (down and then up)
    Animated.loop(
      Animated.sequence([
        // Move down
        Animated.timing(scanLinePosition, {
          toValue: 1,
          duration: 2000, // 2 seconds to scan down
          useNativeDriver: true,
          easing: Easing.linear
        }),
        // Move up
        Animated.timing(scanLinePosition, {
          toValue: 0,
          duration: 2000, // 2 seconds to scan up
          useNativeDriver: true,
          easing: Easing.linear
        })
      ])
    ).start();
  };
  
  // Start the scan animation when analyzing starts
  useEffect(() => {
    if (isAnalyzing) {
      animateScanLine();
    }
  }, [isAnalyzing]);

  // Function to pick image from gallery
  const pickImage = async () => {
    try {
      cameraLogger.info('Attempting to pick image from gallery');
      
      // Request permission if needed
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        cameraLogger.error('Media library permission denied');
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select images.'
        );
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        cameraLogger.info('Image selected from gallery', { 
          uri: result.assets[0].uri.substring(0, 20) + '...' 
        });
        
        // Set the captured image state with the picked image
        setCapturedImage(result.assets[0].uri);
      } else {
        cameraLogger.info('Image picker canceled');
      }
    } catch (error) {
      cameraLogger.error('Error picking image from gallery', { 
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
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
          {/* Frame overlay */}
          <View style={styles.frameOverlay}>
            {/* Top overlay */}
            <View style={styles.overlaySection} />
            
            {/* Middle section with cutout */}
            <View style={styles.middleSection}>
              {/* Left overlay */}
              <View style={styles.overlaySection} />
              
              {/* Transparent rectangular cutout */}
              <View style={styles.frame}>
                {/* Guide text */}
                <Text style={styles.guideText}>Strike a pose!</Text>
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
                onPress={pickImage}
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
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        
        {/* Keep the image preview visible in the background */}
        <View style={styles.previewContainer}>
          {capturedImage ? (
            <Image 
              source={{ uri: capturedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Image not available</Text>
            </View>
          )}
          
          {/* Scanning line */}
          <Animated.View 
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLinePosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Dimensions.get('window').height]
                  })
                }]
              }
            ]}
          />
        </View>
        
        {/* Transformed button with black background and green text during analysis */}
        <TouchableOpacity 
          style={[styles.analyzeButton, styles.analyzeButtonAnalyzing]}
          disabled={true}
        >
          <View style={styles.buttonIconContainer}>
            <ActivityIndicator size="small" color="white" />
          </View>
          <Text style={styles.analyzeTextAnalyzing}>{getAnalysisText()}</Text>
        </TouchableOpacity>
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
      
      <ActionButton
        label="NEXT"
        onPress={analyzeDrip}
        animation="chevron-sequence"
        icon="chevron"
        style={styles.analyzeButton}
      />
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
    flexDirection: 'row',
  },
  analyzeButtonAnalyzing: {
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: '#00FF77',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
  },
  analyzeText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
  },
  analyzeTextAnalyzing: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
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
  overlayForProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#00FF77',
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleSection: {
    width: '100%',
    height: SCREEN_WIDTH * 1.4,
    flexDirection: 'row',
  },
  frame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 1.4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
  guideText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  poseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00FF77',
  },
}); 