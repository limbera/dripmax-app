import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Animated, Easing, StatusBar, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { navigateToPaywall } from '../../utils/paywallSelector';

// Score labels based on rating (placeholder)
const SCORE_LABELS = {
  1: 'Fashion Emergency',
  2: 'Needs Work ASAP',
  3: 'Back to Basics',
  4: 'Almost There...',
  5: 'Midway to Style',
  6: 'The Effort Was...',
  7: 'Getting Iconic',
  8: 'Absolutely Slaying',
  9: 'Main Character',
  10: 'God Tier No Notes'
} as const;

// Component for a section header with icon
const SectionHeader = ({ 
  title, 
  emoji,
  color = '#00FF77'
}: { 
  title: string, 
  emoji: string,
  color?: string
}) => {
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderEmoji}>{emoji}</Text>
      <Text style={[
        styles.sectionHeaderText,
        { color: 'white', fontFamily: 'RobotoMono-Regular' }
      ]}>{title}</Text>
    </View>
  );
};

// Component for tag/chip items
const TagItem = ({ label }: { label: string }) => {
  return (
    <View style={[
      styles.tagItem,
      { backgroundColor: '#333' }
    ]}>
      <Text style={[
        styles.tagItemText,
        { color: 'white', fontFamily: 'RobotoMono-Regular' }
      ]}>{label}</Text>
    </View>
  );
};

// Component for the rating progress bar with ? instead of a score
const RatingProgressBar = () => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState('?');
  const animatedColor = useRef(new Animated.Value(5)).current; // Neutral color (mid range)
  
  // Animate the progress bar on mount - just a preview animation
  useEffect(() => {
    Animated.parallel([
      // Animate the width to 40% (partial preview)
      Animated.timing(animatedWidth, {
        toValue: 40,
        duration: 2000,
        easing: Easing.bezier(0.5, 0, 0.005, 1),
        useNativeDriver: false,
      }),
      // Animate with a neutral color
      Animated.timing(animatedColor, {
        toValue: 5,
        duration: 2000,
        easing: Easing.bezier(0.5, 0, 0.005, 1),
        useNativeDriver: false,
      })
    ]).start();
  }, []);
  
  // Interpolate color based on current animated score
  const backgroundColor = animatedColor.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    outputRange: [
      '#AAAAAA', // Gray for 0
      '#CC0000', // Very dark red for 1
      '#E62020', // Dark red for 2
      '#FF4040', // Bright red for 3
      '#FF6633', // Orange-red for 4
      '#FF9933', // Dark orange for 5
      '#FFBB33', // Orange-yellow for 6
      '#FFDD00', // Gold for 7
      '#80FF99', // Pale green for 8
      '#40FF88', // Light green for 9
      '#00FF77'  // Bright green for 10
    ]
  });
  
  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingBarContainer}>
        <View style={styles.ratingBackground} />
        
        {/* Divider lines */}
        <View style={[styles.dividerLine, { left: '20%' }]} />
        <View style={[styles.dividerLine, { left: '40%' }]} />
        <View style={[styles.dividerLine, { left: '60%' }]} />
        <View style={[styles.dividerLine, { left: '80%' }]} />
        
        <Animated.View 
          style={[
            styles.ratingForeground, 
            { 
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: backgroundColor
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.ratingCircle, 
            { 
              left: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: backgroundColor
            }
          ]}
        >
          <Text style={styles.ratingValue}>{displayedScore}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

// Component for a sub-score indicator with subscription message
const SubScoreIndicator = ({ 
  icon, 
  label, 
  color = '#FFBB33'
}: { 
  icon: string, 
  label: string, 
  color?: string
}) => {
  return (
    <View style={styles.subScoreRow}>
      <View style={styles.subScoreTextColumn}>
        <View style={styles.labelRow}>
          <Text style={styles.subScoreEmoji}>{icon}</Text>
          <Text style={styles.subScoreLabel}>{label}</Text>
        </View>
        <Text style={styles.subScoreDescription}>
          Subscribe to unlock detailed analysis
        </Text>
      </View>
      <Text style={[styles.subScoreNumber, { color }]}>?</Text>
    </View>
  );
};

export default function ResultScreen() {
  const router = useRouter();
  const { image } = useLocalSearchParams<{ image: string }>();
  
  const handleSubscribe = () => {
    // Navigate directly to paywall using our utility
    console.log('[Results] Navigating to paywall');
    navigateToPaywall();
  };
  
  const handleRetake = () => {
    // Go back to capture
    router.push('/(onboarding)/capture');
  };

  if (!image) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{ color: 'white', fontFamily: 'RobotoMono-Regular', marginBottom: 20 }}>
          No image found. Please take a photo first.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#333', padding: 12, borderRadius: 20 }}
          onPress={handleRetake}
        >
          <Text style={{ color: 'white', fontFamily: 'RobotoMono-Regular' }}>Take a Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Main Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCardContent}>
            {/* Top Section with Image and Score */}
            <View style={styles.compactTopSection}>
              <View style={styles.compactImageContainer}>
                <Image 
                  source={{ uri: image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              
              <View style={styles.compactScoreContainer}>
                <Text style={styles.cardTitle}>?/10</Text>
                <Text style={styles.cardSubtitle}>Subscribe to See Score</Text>
                
                <View style={styles.progressBarContainer}>
                  <RatingProgressBar />
                </View>
              </View>
            </View>
            
            <View style={styles.compactDivider} />
            
            {/* Overall Analysis Text */}
            <Text style={[styles.sectionText, { marginBottom: 12 }]}>
              Subscribe to Dripmax Pro to see detailed analysis of your outfit
            </Text>
            
            <View style={styles.compactDivider} />
            
            {/* Sub Scores */}
            <SubScoreIndicator 
              icon="👕" 
              label="Fit" 
              color="#FFBB33"
            />
            
            <View style={styles.compactSubScoreDivider} />
            
            <SubScoreIndicator 
              icon="🎨" 
              label="Color" 
              color="#FF9933"
            />
            
            <View style={styles.compactDivider} />
            
            {/* Subscribe Button */}
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={handleSubscribe}
            >
              <Text style={styles.subscribeButtonText}>Get Dripmax Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Additional sections that require subscription */}
        <View style={styles.section}>
          <SectionHeader 
            title="STYLING TIPS" 
            emoji="✨"
          />
          <Text style={styles.sectionText}>
            Subscribe to Dripmax Pro to see personalized styling tips for your outfit
          </Text>
        </View>
        
        <View style={styles.section}>
          <SectionHeader 
            title="PERFECT FOR" 
            emoji="🎯"
          />
          <View style={styles.tagsContainer}>
            <TagItem label="Subscribe to see" />
            <TagItem label="occasion recommendations" />
          </View>
        </View>
        
        <View style={styles.section}>
          <SectionHeader 
            title="SUGGESTED ITEMS" 
            emoji="🛍️"
          />
          <View style={styles.tagsContainer}>
            <TagItem label="Subscribe to see" />
            <TagItem label="item suggestions" />
          </View>
        </View>
        
        {/* App signature */}
        <View style={styles.appSignature}>
          <Text style={styles.signatureText}>dripmax.app</Text>
        </View>
      </ScrollView>
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
  contentContainer: {
    paddingBottom: 30, // Reduced padding since we removed the footer
  },
  // Score card styles
  scoreCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: '#222222',
    overflow: 'hidden',
  },
  scoreCardContent: {
    padding: 12,
  },
  compactTopSection: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  compactImageContainer: {
    width: '40%',
    aspectRatio: 3/4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444444',
    marginRight: 12,
  },
  compactScoreContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    fontFamily: 'RobotoMono-Regular',
  },
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#444444',
    marginVertical: 14,
  },
  compactSubScoreDivider: {
    height: 1,
    backgroundColor: '#444444',
    marginVertical: 12,
  },
  // Rating progress bar styles
  ratingContainer: {
    paddingHorizontal: 0,
    marginTop: 12,
  },
  ratingBarContainer: {
    height: 40,
    position: 'relative',
  },
  ratingBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    position: 'relative',
    top: 15,
  },
  dividerLine: {
    position: 'absolute',
    width: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: 15,
  },
  ratingForeground: {
    position: 'absolute',
    height: 8,
    top: 15,
    left: 0,
    borderRadius: 4,
  },
  ratingCircle: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -18, // Half of width to center
    top: 0,
  },
  ratingValue: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  // Subscription button
  subscribeButton: {
    backgroundColor: '#00FF77',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  subscribeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  // Sub-score styles
  subScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  subScoreTextColumn: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  subScoreEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  subScoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 2,
  },
  subScoreDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    fontFamily: 'RobotoMono-Regular',
    marginTop: 2,
  },
  subScoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  // Section styles
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#222222',
    marginBottom: 4,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagItemText: {
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
  },
  // App signature
  appSignature: {
    alignItems: 'center',
    padding: 20,
    opacity: 0.7,
  },
  signatureText: {
    fontSize: 14,
    color: '#777',
    fontFamily: 'RobotoMono-Regular',
  }
});

