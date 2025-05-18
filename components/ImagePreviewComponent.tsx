import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActionButton from './ActionButton'; // Assuming ActionButton is in the same components folder
import { uiLogger } from '../utils/logger'; // Corrected to use existing uiLogger
// import { cameraLogger } from '../app/(protected)/camera/index'; // Removed for now

// Simple logger for this component
const previewLogger = {
  info: (message: string, data?: any) => console.log(`[ImagePreviewComponent] ${message}`, data),
  error: (message: string, data?: any) => console.error(`[ImagePreviewComponent] ${message}`, data),
};

interface ImagePreviewProps {
  imageUri: string;
  onAccept: () => void;
  onRetake: () => void; // This will be used for the 'close' button on the preview
  containerStyle?: ViewStyle;
}

export default function ImagePreviewComponent({
  imageUri,
  onAccept,
  onRetake,
  containerStyle,
}: ImagePreviewProps) {
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    if (isAccepted) return; // Prevent multiple calls
    setIsAccepted(true);
    onAccept();
  };

  return (
    <View style={[styles.previewContainer, containerStyle]}>
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }}
          style={styles.previewImage}
          resizeMode="contain"
          onLoadStart={() => uiLogger.info('Preview image load started')}
          onLoad={() => uiLogger.info('Preview image loaded successfully')}
          onError={(e) => uiLogger.error('Preview image load failed', { 
            error: e.nativeEvent.error,
            uri: imageUri.substring(0, 30) + '...'
          })}
        />
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Image not available</Text>
        </View>
      )}

      {/* Transparent top panel for close button, mimicking CameraScreen layout */}
      <View 
        style={styles.topPanel}
        pointerEvents="box-none"
      >
        <View style={[styles.topControlsInternal, { backgroundColor: 'transparent' }]}>
          {/* Empty space to align the close button to the right, matching CameraControlsComponent structure */}
          <View style={{ flex: 1 }} /> 
          
          <TouchableOpacity 
            style={styles.circleButton} 
            onPress={onRetake} // 'Retake' effectively means closing this preview to go back to camera
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ActionButton
        label="NEXT"
        onPress={handleAccept}
        disabled={isAccepted}
        animation="chevron-sequence"
        icon="chevron"
        style={styles.analyzeButton} // This style is from CameraScreen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Match original padding
  },
  topControlsInternal: { // Renamed to avoid conflict if styles are merged later
    flexDirection: 'row',
    justifyContent: 'space-between', // This will push the spacer and button
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  circleButton: { // Style from CameraControlsComponent / CameraScreen
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButton: { // Style from CameraScreen
    position: 'absolute',
    bottom: 100, // Consider making this more dynamic or a prop if it varies
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
}); 