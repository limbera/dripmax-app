import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { usePendingImageStore } from '../../stores/pendingImageStore';
import { navigationLogger } from '../../utils/logger';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const PULSE_BASE_SIZE = 68;

// Import the reusable components
import CameraCaptureViewComponent from '../../components/CameraCaptureViewComponent';
import CameraControlsComponent from '../../components/CameraControlsComponent';
import ImagePreviewComponent from '../../components/ImagePreviewComponent';

export default function InitialCaptureScreen() {
  const router = useRouter();
  const setPendingImageInStore = usePendingImageStore(state => state.setPendingImage);

  const [permission, requestPermission] = useCameraPermissions();
  const [localCapturedImageUri, setLocalCapturedImageUri] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const requestCameraPermission = useCallback(async () => {
    if (isRequestingPermission) {
      return;
    }
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } catch (error) {
      navigationLogger.error('[InitialCaptureScreen] Failed requesting camera permission', { error });
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission, requestPermission]);

  const handleCameraPermissionChoice = useCallback(async () => {
    await requestCameraPermission();
  }, [requestCameraPermission]);

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

  const isLoadingPermissionState = !permission;
  const shouldShowCameraInterstitial = !!permission && permission.status === 'undetermined';

  if (isLoadingPermissionState) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Loading Camera...</Text>
      </View>
    );
  }

  if (shouldShowCameraInterstitial) {
    return (
      <CameraPermissionAlert
        onAllow={handleCameraPermissionChoice}
        onDontAllow={handleCameraPermissionChoice}
        isRequesting={isRequestingPermission}
      />
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.loadingText}>Camera permission is required.</Text>
        <Button
          title={isRequestingPermission ? 'Requesting…' : 'Grant Permission'}
          onPress={requestCameraPermission}
          disabled={isRequestingPermission}
        />
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

type CameraPermissionAlertProps = {
  onAllow: () => void;
  onDontAllow: () => void;
  isRequesting: boolean;
};

function CameraPermissionAlert({ onAllow, onDontAllow, isRequesting }: CameraPermissionAlertProps) {
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulseValue]);

  const pulseScale = pulseValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.55, 2.1],
  });
  const pulseOpacity = pulseValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.65, 0],
  });

  if (isRequesting) {
    return (
      <View style={styles.permissionOverlay}>
        <StatusBar barStyle="light-content" />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={styles.loadingText}>Requesting permission…</Text>
      </View>
    );
  }

  return (
    <View style={styles.permissionOverlay}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.permissionCard}>
        <Text style={styles.permissionTitle}>Allow Dripmax access to your camera</Text>
        <Text style={styles.permissionBody}>
          Camera access lets you take photos of your outfits. You can change this access later in your system settings.
        </Text>
        <View style={styles.permissionButtonsRow}>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onDontAllow}
            disabled={isRequesting}
            activeOpacity={0.6}
          >
            <Text style={styles.permissionButtonText}>Don&apos;t Allow</Text>
          </TouchableOpacity>
          <View style={styles.permissionButtonDivider} />
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onAllow}
            disabled={isRequesting}
            activeOpacity={0.6}
          >
            <View style={styles.allowButtonContent}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseGlow,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              >
                <Svg width={PULSE_BASE_SIZE} height={PULSE_BASE_SIZE} viewBox={`0 0 ${PULSE_BASE_SIZE} ${PULSE_BASE_SIZE}`}>
                  <Defs>
                    <RadialGradient id="pulseGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor="#007AFF" stopOpacity="0.95" />
                      <Stop offset="45%" stopColor="#007AFF" stopOpacity="0.55" />
                      <Stop offset="75%" stopColor="#007AFF" stopOpacity="0.2" />
                      <Stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle
                    cx={PULSE_BASE_SIZE / 2}
                    cy={PULSE_BASE_SIZE / 2}
                    r={PULSE_BASE_SIZE / 2}
                    fill="url(#pulseGradient)"
                  />
                  <Circle
                    cx={PULSE_BASE_SIZE / 2}
                    cy={PULSE_BASE_SIZE / 2}
                    r={(PULSE_BASE_SIZE / 2) - 1}
                    stroke="#007AFF"
                    strokeOpacity={0.8}
                    strokeWidth={2}
                    fill="transparent"
                  />
                </Svg>
              </Animated.View>
              <Text style={[styles.permissionButtonText, styles.permissionButtonPrimary]}>
                Allow
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  permissionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '90%',
    maxWidth: 320,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  permissionTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBody: {
    color: '#1C1C1E',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
  },
  permissionButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#C7C7CC',
  },
  permissionButtonText: {
    color: '#007AFF',
    fontSize: 17,
  },
  permissionButtonPrimary: {
    fontWeight: '600',
  },
  allowButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pulseGlow: {
    position: 'absolute',
    width: PULSE_BASE_SIZE,
    height: PULSE_BASE_SIZE,
    top: -PULSE_BASE_SIZE / 2 + 12,
    alignSelf: 'center',
  },
}); 