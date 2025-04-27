import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Animated, 
  Easing, 
  Dimensions,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Rect, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

// Fun fashion scanning messages
const SCANNING_MESSAGES = [
  "✨ Analyzing color palette...",
  "👗 Checking style cohesion...",
  "🌈 Calculating fashion quotient...",
  "🔍 Detecting fashion trends...",
  "👔 Evaluating outfit synergy...",
  "👠 Measuring accessory impact...",
  "🧥 Calibrating style sensors...",
  "🕶️ Decoding fashion statement...",
  "👚 Scanning for style inspiration...",
  "👕 Processing outfit composition...",
  "💎 Assessing drip factor...",
  "🤖 Running fashion algorithms..."
];

const { width, height } = Dimensions.get('window');

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function ScanningScreen() {
  const router = useRouter();
  const { image } = useLocalSearchParams<{ image: string }>();
  const [progress, setProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState(SCANNING_MESSAGES[0]);
  
  // Animations
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  const dashOffsetAnimation = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  
  // Automatically navigate to results after animation completes
  useEffect(() => {
    if (!image) {
      router.replace('/(onboarding)/capture');
      return;
    }
    
    // Set up message cycling
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % SCANNING_MESSAGES.length;
      setScanMessage(SCANNING_MESSAGES[messageIndex]);
    }, 2000);
    
    // Fade in the whole screen
    Animated.timing(opacityAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Start scanning animation
    Animated.timing(scanAnimation, {
      toValue: 1,
      duration: 3000, // 3 seconds for one complete scan
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    
    // Animate progress bar
    Animated.timing(progressAnimation, {
      toValue: 100,
      duration: 3000, // Same as scan animation
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    
    // Animated dashed lines around scan area
    Animated.loop(
      Animated.timing(dashOffsetAnimation, {
        toValue: 50,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Start emoji spinning animation - back and forth like in AppLoadingScreen
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Update progress percentage for text display
    progressAnimation.addListener(({ value }) => {
      setProgress(Math.round(value));
    });
    
    // Navigate to results after animation completes
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/(onboarding)/results',
        params: { image }
      });
    }, 3500); // Slightly longer than animation to ensure it completes
    
    return () => {
      clearInterval(messageInterval);
      progressAnimation.removeAllListeners();
      clearTimeout(timer);
      
      // Clean up animations
      dashOffsetAnimation.stopAnimation();
      rotateValue.stopAnimation();
    };
  }, [image, router, scanAnimation, progressAnimation, opacityAnimation, dashOffsetAnimation, rotateValue]);
  
  // Map rotation value to degrees - back and forth
  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  if (!image) {
    return null; // Handled by useEffect to redirect
  }
  
  return (
    <Animated.View style={[styles.container, { opacity: opacityAnimation }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Image */}
      <Image source={{ uri: image }} style={styles.image} />
      
      {/* Scanning overlay */}
      <View style={styles.overlay}>
        {/* Animated dashed border around scan area */}
        <View style={styles.scanBorderContainer}>
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="scanGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#00FF77" stopOpacity="1" />
                <Stop offset="1" stopColor="#00FFFF" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Animated.View style={{ transform: [{ translateY: dashOffsetAnimation }] }}>
              <Rect
                x="10%"
                y="15%"
                width="80%"
                height="70%"
                strokeWidth="2"
                stroke="url(#scanGradient)"
                strokeDasharray="10,5"
                fill="transparent"
              />
            </Animated.View>
          </Svg>
        </View>
        
        {/* Scanning line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              top: scanAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [height * 0.15, height * 0.85]
              })
            }
          ]}
        >
          <Svg height="4" width={width}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#00FF77" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#00FF77" stopOpacity="1" />
                <Stop offset="1" stopColor="#00FF77" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={width}
              height="4"
              fill="url(#grad)"
            />
          </Svg>
        </Animated.View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {/* Update to display emoji and text separately with spinning emoji */}
          <View style={styles.messageContainer}>
            <Animated.Text 
              style={[
                styles.emojiIcon, 
                { 
                  transform: [{ rotate: spin }] 
                }
              ]}
            >
              {scanMessage.split(' ')[0]}
            </Animated.Text>
            <Text style={styles.analyzeText}>
              {scanMessage.split(' ').slice(1).join(' ')}
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  image: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    zIndex: 10,
  },
  scanBorderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emojiIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  analyzeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF77',
  },
  progressText: {
    color: '#00FF77',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
}); 