import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, StatusBar, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { navigationLogger } from '../../utils/logger';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

// Import the reusable components
import CameraCaptureViewComponent from '../../components/CameraCaptureViewComponent';
import CameraControlsComponent from '../../components/CameraControlsComponent';
import ImagePreviewComponent from '../../components/ImagePreviewComponent';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function InitialCaptureScreen() {
  const router = useRouter();
  const setPendingImageInStore = usePendingImageStore(state => state.setPendingImage);

  const [permission, requestPermission] = useCameraPermissions();
  const [localCapturedImageUri, setLocalCapturedImageUri] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    } else if (!permission.granted) {
      // Consider showing an alert or a message explaining why permission is needed
      // and potentially guide them to settings or offer to request again.
      Alert.alert('Camera Permission Required', 'This feature needs camera access to work.', [
        { text: 'Cancel', onPress: () => router.back(), style: 'cancel' },
        { text: 'Grant Permission', onPress: requestPermission },
      ]);
    }
  }, [permission, requestPermission, router]);

  const toggleCameraFacing = () => setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  const toggleFlash = () => setFlashMode(current => (current === 'off' ? 'on' : 'off'));

  const handleCloseCamera = () => {
    // Decide where to navigate if user closes from this initial capture: back or to a default screen?
    // For now, just go back if possible.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(protected)/(tabs)/drips'); // Fallback to a default screen
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Access to your photo library is needed.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalCapturedImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to select image from gallery.');
      navigationLogger.error('[InitialCaptureScreen] Error picking image', { error });
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ exif: false });
      if (photo && photo.uri) {
        setLocalCapturedImageUri(photo.uri);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to take picture.');
      navigationLogger.error('[InitialCaptureScreen] Error taking picture', { error });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAcceptPreview = () => {
    if (localCapturedImageUri) {
      setPendingImageInStore(localCapturedImageUri);
      navigationLogger.info('[InitialCaptureScreen] Image accepted, URI stored. Navigating to pre-paywall.', { uri: localCapturedImageUri });
      router.push('/(protected)/pre-paywall-flow');
    } else {
      Alert.alert('Error', 'No image to accept.');
    }
  };

  const handleRetakePreview = () => {
    setLocalCapturedImageUri(null); // Clear local preview to go back to camera view
  };

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Loading Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.loadingText}>Camera permission is required.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
        {router.canGoBack() && <Button title="Go Back" onPress={() => router.back()} color="grey"/>}
      </View>
    );
  }

  if (localCapturedImageUri) {
    // Show ImagePreviewComponent if an image has been captured/picked
    return (
      <ImagePreviewComponent
        imageUri={localCapturedImageUri}
        onAccept={handleAcceptPreview}
        onRetake={handleRetakePreview}
        containerStyle={styles.container} // Ensure this style is just flex:1, bg:black
      />
    );
  }

  // Show CameraCaptureView and CameraControlsComponent for live camera
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Capture Your Outfit', 
          headerShown: false, // Match CameraScreen's behavior for immersive feel
        }} 
      />
      <StatusBar hidden />
      <CameraCaptureViewComponent
        cameraRef={cameraRef}
        facing={cameraFacing}
        flashMode={flashMode}
        style={styles.cameraViewStyle} // flex: 1 for the camera view itself
        showSilhouette={false}
        // Default silhouette and guide text will be used
      />
      <CameraControlsComponent
        onClose={handleCloseCamera} // Different close action than main camera screen
        onFlipCamera={toggleCameraFacing}
        onToggleFlash={toggleFlash}
        onPickImage={pickImage}
        onCapture={takePicture}
        flashMode={flashMode}
        isCapturing={isCapturing}
        // CameraControlsComponent is absolutely positioned and will overlay CameraCaptureViewComponent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  cameraViewStyle: {
    flex: 1,
  }
}); 