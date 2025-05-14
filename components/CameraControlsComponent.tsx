import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CameraControlsProps {
  onClose: () => void;
  onFlipCamera: () => void;
  onToggleFlash: () => void;
  onPickImage: () => void;
  onCapture: () => void;
  flashMode: 'on' | 'off';
  isCapturing: boolean;
  // Optional style for the main container to allow flexible positioning from parent
  containerStyle?: ViewStyle; 
}

export default function CameraControlsComponent({
  onClose,
  onFlipCamera,
  onToggleFlash,
  onPickImage,
  onCapture,
  flashMode,
  isCapturing,
  containerStyle,
}: CameraControlsProps) {
  return (
    <View style={[styles.cameraControlsContainer, containerStyle]}>
      {/* Top row controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.circleButton} onPress={onToggleFlash}>
          <Ionicons
            name={flashMode === 'on' ? 'flash' : 'flash-off'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.circleButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom row controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.circleButton} onPress={onPickImage}>
          <Ionicons name="images-outline" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
            ]}
            onPress={onCapture}
            disabled={isCapturing}
          >
            <View
              style={[
                styles.captureButtonInner,
                isCapturing && styles.captureButtonInnerDisabled,
              ]}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.circleButton} onPress={onFlipCamera}>
          <Ionicons name="sync-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
    // backgroundColor: 'rgba(255,0,0,0.1)', // For debugging layout
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Match original padding
    width: '100%',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 50 : 45, // Match original padding (or adjust as needed)
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
}); 