import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions, // Keep if SCREEN_HEIGHT is calculated here, or pass as prop
  StatusBar, // Keep StatusBar if needed for hidden, though parent might handle it
  ViewStyle // Added ViewStyle for containerStyle prop
} from 'react-native';
import { Stack } from 'expo-router'; // For Stack.Screen if titles are managed here

// If SCANNING_MESSAGES is used internally for cycling, it can be defined here
// or passed as a prop if it needs to be dynamic from the parent.
// For now, let's assume it's passed if we want flexibility, or defined if static to this anim.

interface ScanningAnimationProps {
  capturedImageUri: string | null;
  screenHeight: number;
  isActive: boolean;
  mode?: 'full' | 'preview';
  initialScanMessage?: string;      // Will now be used by preview mode too
  scanningMessagesArray?: string[]; // Will now be used by preview mode too
  containerStyle?: ViewStyle; // To accept style from parent (e.g., flex:1)
  // previewMessage prop is no longer needed as we use the main scanningMessagesArray
}

const ScanningAnimationComponent: React.FC<ScanningAnimationProps> = ({
  capturedImageUri,
  screenHeight,
  isActive,
  mode = 'full',
  initialScanMessage = "👕 Looking for style patterns...", // Default if array is empty
  scanningMessagesArray = ["👕 Looking for style patterns...", "🧵 Analyzing fabric textures..."], // Default with a couple of messages
  containerStyle, // Use this for the root view
}) => {
  // Initialize with a random message if in preview mode and array is available
  // Otherwise, use initialScanMessage for full mode or as fallback
  const [currentScanMessage, setCurrentScanMessage] = useState(() => {
    if (scanningMessagesArray && scanningMessagesArray.length > 0) {
      return scanningMessagesArray[Math.floor(Math.random() * scanningMessagesArray.length)];
    }
    return initialScanMessage;
  });
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let scanMessageInterval: NodeJS.Timeout | undefined;
    let rotateAnimation: Animated.CompositeAnimation | undefined;
    let scanLineAnimation: Animated.CompositeAnimation | undefined;

    if (isActive) {
      scanLinePosition.setValue(0);
      rotateValue.setValue(0);

      // Common setup for messages and emoji for both modes (if messages are to be used)
      if (scanningMessagesArray && scanningMessagesArray.length > 0) {
        // Set initial message right away
        setCurrentScanMessage(scanningMessagesArray[Math.floor(Math.random() * scanningMessagesArray.length)]);
        // Only set interval for full mode for continuous cycling
        if (mode === 'full') {
          scanMessageInterval = setInterval(() => {
            setCurrentScanMessage(scanningMessagesArray[Math.floor(Math.random() * scanningMessagesArray.length)]);
          }, 3000);
        }
      }

      if (mode === 'full') {
        scanLineAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(scanLinePosition, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
            Animated.timing(scanLinePosition, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.linear })
          ])
        );
        rotateAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(rotateValue, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(rotateValue, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
          ])
        );
      } else if (mode === 'preview') {
        // Symmetrical scan line: 1.5s down, 1.5s up. Total 3s. No loop.
        scanLineAnimation = Animated.sequence([
          Animated.timing(scanLinePosition, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(scanLinePosition, { toValue: 0, duration: 1500, useNativeDriver: true, easing: Easing.linear }),
        ]);
        // Simple emoji pulse for preview (e.g., one full rotation or a pulse)
        rotateAnimation = Animated.sequence([
          Animated.timing(rotateValue, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]);
        // Loop it a couple of times to cover the 3s scan line, or adjust iterations
        Animated.loop(rotateAnimation, {iterations: 2}).start(); 
      }

      if (scanLineAnimation) scanLineAnimation.start();
      if (rotateAnimation && mode === 'full') rotateAnimation.start(); // only loop full mode rotation anim
      
      return () => {
        if (scanMessageInterval) clearInterval(scanMessageInterval);
        if (rotateAnimation) rotateAnimation.stop();
        if (scanLineAnimation) scanLineAnimation.stop();
        scanLinePosition.setValue(0);
        rotateValue.setValue(0);
      };
    }
  // Removed previewMessage from dependencies, added initialScanMessage
  }, [isActive, mode, scanLinePosition, rotateValue, scanningMessagesArray, screenHeight, initialScanMessage]);

  const emojiPart = typeof currentScanMessage === 'string' ? currentScanMessage.split(' ')[0] : '✨'; // Default emoji if needed
  const textPart = typeof currentScanMessage === 'string' ? currentScanMessage.split(' ').slice(1).join(' ') : currentScanMessage;

  // The root is now what used to be styles.previewContainer.
  // It receives containerStyle from the parent (CameraScreen) which should be {flex:1, backgroundColor:'black'}
  return (
    <View style={[styles.rootView, containerStyle]}>
      {/* StatusBar hidden is ideally handled by the parent screen (CameraScreen) consistently */}
      {/* <StatusBar hidden /> */}
      {capturedImageUri ? (
        <Image 
          source={{ uri: capturedImageUri }}
          style={styles.previewImage} // This will fill the rootView
          resizeMode="contain"
        />
      ) : (
        mode === 'full' && (
          <View style={styles.placeholderContainer}> {/* This will overlay the black bg if no image */}
            <Text style={styles.placeholderText}>Image not available</Text>
          </View>
        )
      )}
      <Animated.View 
        style={[
          styles.scanLine,
          {
            transform: [{
              translateY: scanLinePosition.interpolate({
                inputRange: [0, 1],
                outputRange: [0, screenHeight] 
              })
            }]
          }
        ]}
      />
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContent}>
          <View style={styles.messageContainer}>
            <Animated.Text 
              style={[
                styles.emojiIcon, 
                { 
                  transform: [{ 
                    rotate: rotateValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'] 
                    })
                  }] 
                }
              ]}
            >
              {emojiPart}
            </Animated.Text>
            <Text style={styles.scanningMessage}>
              {textPart}
            </Text>
          </View>
        </View>
        {/* Logo: Render always, regardless of mode */}
        <Text style={styles.logoTextBottom}>
          dripmax
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootView: { // Renamed from previewContainer, this is now the root of this component
    flex: 1,
    backgroundColor: 'black', // Default background, parent can override via containerStyle
    overflow: 'hidden', // Ensure children don't unexpectedly overflow if not positioned absolutely
  },
  previewImage: {
    // This image is now a direct child of rootView, it needs to be absolute if other things overlay it
    ...StyleSheet.absoluteFillObject, // Make image fill the container, other elements will overlay
    width: '100%', // Redundant with absoluteFillObject but good for clarity
    height: '100%',// Redundant with absoluteFillObject
  },
  placeholderContainer: { 
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1, // Just above background image if it exists but below other overlays
  },
  placeholderText: { color: '#aaaaaa', fontSize: 16 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00FF77',
    zIndex: 10,
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  emojiIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  scanningMessage: {
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'SpaceMono', 
    paddingHorizontal: 20,
  },
  logoTextBottom: {
    color: '#00FF77',
    fontSize: 36,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontFamily: 'SpaceMono',
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
});

export default ScanningAnimationComponent; 