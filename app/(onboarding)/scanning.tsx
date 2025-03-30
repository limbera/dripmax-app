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
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function ScanningScreen() {
  const router = useRouter();
  const { image } = useLocalSearchParams<{ image: string }>();
  const [progress, setProgress] = useState(0);
  
  // Animations
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  
  // Automatically navigate to results after animation completes
  useEffect(() => {
    if (!image) {
      router.replace('/(onboarding)/capture');
      return;
    }
    
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
      progressAnimation.removeAllListeners();
      clearTimeout(timer);
    };
  }, [image, router, scanAnimation, progressAnimation, opacityAnimation]);
  
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
        {/* Scanning line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              top: scanAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height]
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
          <Text style={styles.analyzeText}>Analyzing outfit...</Text>
          
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
  },
  progressContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  analyzeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: 'RobotoMono-Regular',
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
    fontFamily: 'RobotoMono-Regular',
  },
}); 