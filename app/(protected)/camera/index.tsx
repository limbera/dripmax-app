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
import { useRouter, Stack, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../../utils/logger';
import { useOutfitStore } from '../../../stores/outfitStore';
import { supabase } from '../../../services/supabase';
import * as FileSystem from 'expo-file-system';
import * as base64 from 'base64-js';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FaceDetector from 'expo-face-detector';
import * as ImagePicker from 'expo-image-picker';
import ActionButton from '../../../components/ActionButton';
import { usePendingImageStore } from '../../../stores/pendingImageStore';
import { trackEvent, trackOutfitWorkflow, trackOutfitActions } from '@/utils/analytics';
import useScreenTracking from '../../../hooks/useScreenTracking';
import CameraControlsComponent from '../../../components/CameraControlsComponent';
import CameraCaptureViewComponent from '../../../components/CameraCaptureViewComponent';
import ImagePreviewComponent from '../../../components/ImagePreviewComponent';
import ScanningAnimationComponent from '../../../components/ScanningAnimationComponent';

// FASHION_FACTS is no longer used in CameraScreen if setFashionFact was removed and it was its only consumer
// const FASHION_FACTS = [ ... ]; 

// Fun fashion scanning messages with emojis
const SCANNING_MESSAGES = [
  "👕 Looking for style patterns...",
  "🧵 Analyzing fabric textures...",
  "🌈 Checking color coordination...",
  "👗 Measuring outfit synergy...",
  "👠 Evaluating accessory choices...",
  "💼 Calculating outfit vibe...",
  "🧢 Examining proportions...",
  "👚 Decoding fashion language...",
  "👔 Running style algorithms...",
  "👖 Preparing fashion assessment..."
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Create an animated version of the SVG Circle
// const AnimatedCircle = Animated.createAnimatedComponent(Circle); // Commented out as Circle is not defined/imported and AnimatedCircle seems unused in current JSX

const cameraLogger = {
  info: (message: string, data?: any) => logger.info(`[Camera] ${message}`, data),
  error: (message: string, data?: any) => logger.error(`[Camera] ${message}`, data),
};

export default function CameraScreen() {
  // Track screen view
  useEffect(() => {
    trackOutfitWorkflow.scanStarted();
  }, []);

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const navigation = useNavigation();
  const { addOutfit, getOutfitWithFeedback } = useOutfitStore();
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
    setCameraFacing(current => {
      const newFacing = current === 'back' ? 'front' : 'back';
      trackEvent('Camera Facing Changed', { facing: newFacing });
      cameraLogger.info('Camera facing switched', { facing: newFacing });
      return newFacing;
    });
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      const newMode = current === 'off' ? 'on' : 'off';
      trackEvent('Flash Mode Changed', { mode: newMode });
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
    setIsCapturing(true);
    try {
      // @ts-ignore - Original code had this for takePictureAsync, may still be needed depending on exact CameraView typing for refs
      const photo = await cameraRef.current.takePictureAsync({ exif: false });
      
      // Add a check for photo being defined before accessing its properties
      if (photo && photo.uri) {
        cameraLogger.info('Photo captured', { 
          hasUri: !!photo.uri,
          width: photo.width,
          height: photo.height,
          uri: photo.uri.substring(0, 30) + '...'
        });
        setCapturedImage(photo.uri);
        trackOutfitWorkflow.photoPreview({
          width: photo.width,
          height: photo.height
        });
        cameraLogger.info('Photo set to state', { uri: photo.uri.substring(0, 30) + '...' });
      } else {
        throw new Error('Photo URI is missing or photo object is undefined');
      }
    } catch (e: any) {
      cameraLogger.error('Failed to take picture', { error: e.message || String(e) });
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      trackEvent('Error', {
        error_type: 'Outfit Photo Capture Failed',
        error_message: e.message || String(e)
      });
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
      // Track event with standardized naming
      trackOutfitWorkflow.analysisStarted();
      
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
      // Track error
      trackEvent('Error', {
        error_type: 'Outfit Analysis Failed',
        error_message: error instanceof Error ? error.message : String(error)
      });
      cameraLogger.error('Failed during analysis', { 
        error: error instanceof Error ? error.message : String(error)
      });
      Alert.alert('Error', 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Record start time for analytics
    const startTime = Date.now();
    
    // Start progress animation
    setProgress(0);
    
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
      
      updateProgress(50, 'Outfit record created');
      
      // Phase 4: Poll for feedback with incremental progress (50-95%)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      let hasFeedback = false;
      
      while (attempts < maxAttempts && !hasFeedback) {
        attempts++;
        
        // Calculate progress based on polling attempts
        const pollProgress = 50 + Math.min(45, (attempts / maxAttempts) * 45);
        updateProgress(pollProgress, `Processing outfit (attempt ${attempts}/${maxAttempts})`);
        
        // Check if the outfit has feedback yet
        const outfit = await getOutfitWithFeedback(newOutfitId);
        
        if (outfit?.feedback) {
          hasFeedback = true;
          updateProgress(95, 'Outfit analysis complete');
          
          // Record completion time for analytics
          const completionTime = Date.now();
          const processingTime = completionTime - startTime;
          
          // Track successful analysis
          trackOutfitWorkflow.analysisCompleted(
            newOutfitId,
            processingTime,
            { success: true, attempts: attempts }
          );
          trackOutfitActions.added(newOutfitId);
          
          // Navigate to the outfit detail with a short delay for better UX
          setTimeout(() => {
            updateProgress(100, 'Ready');
            navigateToOutfitDetail(newOutfitId);
          }, 500);
          
          return;
        }
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // If we get here, polling timed out without getting feedback
      if (!hasFeedback) {
        // Still track as completed but with timeout flag
        trackOutfitWorkflow.analysisCompleted(
          newOutfitId,
          Date.now() - startTime,
          { success: true, timeout: true }
        );
        trackOutfitActions.added(newOutfitId);
        
        updateProgress(95, 'Analysis taking longer than expected');
        
        // Navigate anyway after timeout
        setTimeout(() => {
          navigateToOutfitDetail(newOutfitId);
        }, 1000);
      }
      
    } catch (error) {
      // Track error
      trackEvent('Error', {
        error_type: 'Outfit Analysis Processing Failed',
        error_message: error instanceof Error ? error.message : String(error)
      });
      
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
        [{ resize: { width: 1200 } }], // Resize to max width of 1200px while maintaining aspect ratio
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
    cameraLogger.info('Navigating to outfit detail, ensuring back goes to Drips/Home', { outfitId: id });

    navigation.dispatch(
      CommonActions.reset({
        index: 1, 
        routes: [
          // Option 1: Target the (tabs) navigator group directly.
          // This assumes 'drips' is the initial route of your (tabs) navigator.
          { name: '(tabs)' as never }, 
          { 
            name: 'outfit/[id]' as never, 
            params: { id, fromCamera: "true" },
          }
        ],
      })
    );
  };

  const resetCamera = () => {
    // Clear captured image to return to camera mode
    setCapturedImage(null);
    
    // Reset any ongoing analysis
    setIsAnalyzing(false);
    setProgress(0);
    
    cameraLogger.info('Camera reset, returning to capture mode');
  };

  const goBackToHome = () => router.back();

  // Re-adding the pickImage function
  const pickImage = async () => {
    try {
      cameraLogger.info('Attempting to pick image from gallery');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        cameraLogger.error('Media library permission denied');
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select images.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        cameraLogger.info('Image selected from gallery', {
          uri: result.assets[0].uri.substring(0, 20) + '...',
          width: result.assets[0].width,
          height: result.assets[0].height,
        });
        setCapturedImage(result.assets[0].uri);
      } else {
        cameraLogger.info('Image picker canceled');
      }
    } catch (error: any) {
      cameraLogger.error('Error picking image from gallery', { 
        error: error.message || String(error)
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

  // CAMERA PREVIEW VIEW (when no image is captured yet)
  if (!capturedImage) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar hidden />
        <CameraCaptureViewComponent
          cameraRef={cameraRef}
          facing={cameraFacing}
          flashMode={flashMode}
          style={styles.camera}
          showSilhouette={false}
        />
        <CameraControlsComponent
          onClose={goBackToHome}
          onFlipCamera={toggleCameraFacing}
          onToggleFlash={toggleFlash}
          onPickImage={pickImage}
          onCapture={takePicture}
          flashMode={flashMode}
          isCapturing={isCapturing}
        />
      </View>
    );
  }
  
  if (isAnalyzing) {
    // Now use the ScanningAnimationComponent
    return (
      <ScanningAnimationComponent
        capturedImageUri={capturedImage} 
        initialScanMessage={SCANNING_MESSAGES[0]} 
        scanningMessagesArray={SCANNING_MESSAGES}
        screenHeight={SCREEN_HEIGHT}
        isActive={isAnalyzing} 
        containerStyle={styles.container}
      />
    );
  }
  
  // IMAGE PREVIEW VIEW (when an image is captured, and we are NOT analyzing yet)
  // This is where ImagePreviewComponent is used.
  return (
    <ImagePreviewComponent
      imageUri={capturedImage as string} 
      onAccept={analyzeDrip}      
      onRetake={resetCamera}      
      containerStyle={styles.container} 
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { color: 'white', fontSize: 16, marginTop: 10, textAlign: 'center' },
  camera: { flex: 1 },
}); 