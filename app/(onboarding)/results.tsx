import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, StatusBar, Dimensions, SafeAreaView, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { navigationLogger } from '../../utils/logger';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Component for the score meter that spans two columns
const FullWidthScoreMeter = ({ label, onPress }: { label: string, onPress?: () => void }) => {
  return (
    <TouchableOpacity 
      style={styles.fullWidthMeterContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.scoreMeterLabel}>{label}</Text>
      <View style={styles.scorePlaceholder}>
        <Ionicons name="lock-closed" size={16} color="#666" style={styles.lockIcon} />
        <Text style={styles.lockedScoreText}>Unlock with Pro</Text>
      </View>
      <View style={styles.scoreMeterLine}>
        <View style={styles.scoreMeterBackground} />
        <View style={styles.scoreMeterFill} />
      </View>
    </TouchableOpacity>
  );
};

// Component for the regular score meter line
const ScoreMeterLine = ({ label, onPress }: { label: string, onPress?: () => void }) => {
  return (
    <TouchableOpacity 
      style={styles.scoreMeterContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.scoreMeterLabel}>{label}</Text>
      <View style={styles.scorePlaceholder}>
        <Ionicons name="lock-closed" size={16} color="#666" style={styles.lockIcon} />
        <Text style={styles.lockedScoreText}>Unlock with Pro</Text>
      </View>
      <View style={styles.scoreMeterLine}>
        <View style={styles.scoreMeterBackground} />
        <View style={styles.scoreMeterFill} />
      </View>
    </TouchableOpacity>
  );
};

// Component for locked feature card
const LockedFeatureCard = ({ title, icon, onPress }: { title: string, icon: string, onPress?: () => void }) => {
  return (
    <TouchableOpacity 
      style={styles.lockedFeatureCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.lockedFeatureHeader}>
        <Text style={styles.lockedFeatureIcon}>{icon}</Text>
        <Text style={styles.lockedFeatureTitle}>{title}</Text>
      </View>
      <View style={styles.lockedFeatureContent}>
        <Ionicons name="lock-closed" size={18} color="#666" style={styles.lockIcon} />
        <Text style={styles.lockedFeatureText}>Unlock with Pro</Text>
      </View>
    </TouchableOpacity>
  );
};

// Chevron sequence animation component
const ChevronSequence = () => {
  // Animation values
  const chevron1Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron2Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron3Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron1Scale = useRef(new Animated.Value(1)).current;
  const chevron2Scale = useRef(new Animated.Value(1)).current;
  const chevron3Scale = useRef(new Animated.Value(1)).current;
  
  // Setup animation when component mounts
  useEffect(() => {
    animateChevronSequence();
    
    return () => {
      // Cleanup animations
      chevron1Opacity.stopAnimation();
      chevron2Opacity.stopAnimation();
      chevron3Opacity.stopAnimation();
      chevron1Scale.stopAnimation();
      chevron2Scale.stopAnimation();
      chevron3Scale.stopAnimation();
    };
  }, []);
  
  // Animation for the chevron sequence
  const animateChevronSequence = () => {
    Animated.sequence([
      // First chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron1Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron1Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron1Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Shorter pause
      Animated.delay(10),
      
      // Second chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron2Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron2Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron2Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Shorter pause
      Animated.delay(10),
      
      // Third chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron3Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron3Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron3Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Shorter pause when all are lit (reduced from 1000ms to 300ms)
      Animated.delay(300),
      
      // All chevrons turn off at the same time
      Animated.parallel([
        // First chevron
        Animated.parallel([
          Animated.timing(chevron1Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron1Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron1Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ]),
        
        // Second chevron
        Animated.parallel([
          Animated.timing(chevron2Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron2Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron2Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ]),
        
        // Third chevron
        Animated.parallel([
          Animated.timing(chevron3Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron3Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron3Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ])
      ]),
      
      // Shorter pause before restarting (reduced from 1000ms to 300ms)
      Animated.delay(300),
    ]).start(() => {
      animateChevronSequence();
    });
  };
  
  return (
    <View style={styles.chevronContainer}>
      <Animated.View style={[
        styles.chevronWrapper, 
        { 
          opacity: chevron1Opacity,
          transform: [{ scale: chevron1Scale }]
        }
      ]}>
        <Ionicons name="chevron-forward" size={24} color="black" />
      </Animated.View>
      <Animated.View style={[
        styles.chevronWrapper, 
        { 
          opacity: chevron2Opacity,
          transform: [{ scale: chevron2Scale }]
        }
      ]}>
        <Ionicons name="chevron-forward" size={24} color="black" />
      </Animated.View>
      <Animated.View style={[
        styles.chevronWrapper, 
        { 
          opacity: chevron3Opacity,
          transform: [{ scale: chevron3Scale }]
        }
      ]}>
        <Ionicons name="chevron-forward" size={24} color="black" />
      </Animated.View>
    </View>
  );
};

// Waving hand emoji animation
const WavingHand = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Create the waving animation sequence
    Animated.loop(
      Animated.sequence([
        // Rotate 25 degrees clockwise (increased from 15)
        Animated.timing(rotateAnim, {
          toValue: 25,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Shorter pause at peak (halved from 150ms to 75ms)
        Animated.delay(75),
        // Rotate back to 0 degrees
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Much longer pause at baseline
        Animated.delay(600),
      ])
    ).start();
  }, []);
  
  // Convert rotation value to degrees
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 25], 
    outputRange: ['0deg', '25deg'],
  });
  
  return (
    <Animated.Text 
      style={[
        styles.emojiIcon,
        { transform: [{ rotate }] }
      ]}
    >
      👋
    </Animated.Text>
  );
};

export default function ResultScreen() {
  const router = useRouter();
  
  useEffect(() => {
    navigationLogger.info('[ResultScreen] Dummy results screen mounted.');
  }, []);
  
  const handleSubscribe = () => {
    navigationLogger.info('[ResultScreen] Navigating to paywall.');
    router.push({
      pathname: '/(auth)/paywall'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>👀 Reveal Your Results</Text>
        </View>
        
        {/* Profile Photo - NOW WITH STATIC DUMMY IMAGE */}
        <View style={styles.profileContainer}>
          <Image 
            source={require('../../assets/images/dummy-image-woman.png')} // Changed to dummy-image-woman.png
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Score Meters */}
        <TouchableOpacity 
          style={styles.scoreCard}
          onPress={handleSubscribe}
          activeOpacity={0.7}
        >
          <View style={styles.overallHeader}>
            <Text style={styles.overallHeaderIcon}>🏆</Text>
            <Text style={styles.overallHeaderTitle}>YOUR RATING</Text>
          </View>
          
          {/* Full Width Overall Meter */}
          <View style={styles.scoreRow}>
            <FullWidthScoreMeter label="Overall" onPress={handleSubscribe} />
          </View>
          
          <View style={styles.scoreRow}>
            <ScoreMeterLine label="Fit" onPress={handleSubscribe} />
            <ScoreMeterLine label="Color" onPress={handleSubscribe} />
          </View>
        </TouchableOpacity>
        
        {/* Feature Cards */}
        <LockedFeatureCard title="STYLING TIPS" icon="✨" onPress={handleSubscribe} />
        <LockedFeatureCard title="SUGGESTED ITEMS" icon="🛍️" onPress={handleSubscribe} />
        
        {/* Bottom Padding to Ensure Content Scrolls Above Fixed Button */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Fixed CTA Button at Bottom */}
      <SafeAreaView style={styles.fixedButtonContainer}>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={handleSubscribe}
        >
          <View style={styles.ctaContent}>
            <Text style={styles.ctaText}>GET DRIPMAX PRO</Text>
            <WavingHand />
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollContentContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  // Title Section
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  titleText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  // Profile Photo
  profileContainer: {
    width: SCREEN_WIDTH * 0.35,
    aspectRatio: 1,
    marginBottom: 30,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#222',
  },
  // Score Card
  scoreCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  // Regular score meter styles
  scoreMeterContainer: {
    width: '48%',
    position: 'relative',
  },
  fullWidthMeterContainer: {
    width: '100%',
    position: 'relative',
  },
  scoreMeterLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 6,
  },
  scorePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedScoreText: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'RobotoMono-Regular',
    marginLeft: 4,
  },
  scoreMeterLine: {
    height: 8,
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  scoreMeterBackground: {
    height: '100%',
    width: '0%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  scoreMeterFill: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    backgroundColor: '#AAAAAA',
    borderRadius: 3,
  },
  // Locked Feature Card
  lockedFeatureCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  lockedFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockedFeatureIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  lockedFeatureTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  lockedFeatureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 8,
  },
  lockedFeatureText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
  },
  // Bottom padding to ensure content scrolls above fixed button
  bottomPadding: {
    height: 100, // Adjust this value based on your button height + desired padding
  },
  // Fixed button container
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', // Semi-transparent background to make button stand out
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36, // Increased bottom padding from 24 to 36
  },
  // CTA Button
  ctaButton: {
    width: '100%',
    backgroundColor: '#00FF77',
    borderRadius: 100, // Increased from 40 to 100 for very circular edges
    paddingVertical: 8, // Reduced from 18 to 8 to make it much less tall
    alignItems: 'center',
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: 'black',
    fontSize: 20, // Increased from 18 to 20
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
    marginRight: 12, // Space for the emoji
    letterSpacing: 1, // Slightly spaced letters for emphasis
  },
  emojiIcon: {
    fontSize: 48, // Doubled from 24 to 48
    marginLeft: 8, // Slightly increased from 4 to 8
  },
  // Chevron animation styles
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronWrapper: {
    marginLeft: -17, // Negative margin for overlap
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overallHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  overallHeaderTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
});

