import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { CameraView } from 'expo-camera'; // Ensure this is the correct import

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface CameraCaptureViewProps {
  cameraRef: React.Ref<CameraView>;
  facing: 'front' | 'back';
  flashMode: 'on' | 'off';
  style?: ViewStyle;
  showSilhouette?: boolean;
  guideText?: string;
  showGuideText?: boolean;
  // silhouetteImageSource?: ImageSourcePropType; // Optional if we make it a prop
}

export default function CameraCaptureViewComponent({
  cameraRef,
  facing,
  flashMode,
  style,
  showSilhouette = false,
  guideText = "📸 Take a photo of your outfit and we'll rate it out of 10.",
  showGuideText = true,
}: CameraCaptureViewProps) {
  return (
    <CameraView
      style={[styles.camera, style]} // Apply passed style, default to filling
      facing={facing}
      flash={flashMode}
      ref={cameraRef}
      // Consider adding other useful CameraView props if needed: barCodeScannerSettings, onBarcodeScanned, etc.
    >
      <View style={styles.overlayContainer}>
        {showSilhouette && (
          <Image 
            source={require('../assets/images/silhouette-overlay.png')} // Corrected path
            style={styles.silhouetteImage}
            resizeMode="contain"
          />
        )}
        {showGuideText && (
          <Text style={styles.guideText}>{guideText}</Text>
        )}
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1, // Default to filling available space
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  silhouetteImage: {
    width: SCREEN_WIDTH * 1.4, // Values from original CameraScreen styles
    height: SCREEN_HEIGHT * 1.35,
    opacity: 0.5,
    transform: [{ translateY: -50 }],
  },
  guideText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'absolute',
    bottom: '18%',
    width: '80%',
    maxWidth: 300,
    zIndex: 10,
  },
}); 