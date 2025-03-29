import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, ActionSheetIOS, Platform, Animated, Easing, Share, Modal, StatusBar } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useOutfitStore } from '../../../stores/outfitStore';
import { outfitLogger } from '../../../utils/logger';
import { getTransformedImageUrl, supabase } from '../../../services/supabase';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

// Score labels based on rating
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

// Function to get the appropriate score label
const getScoreLabel = (score: number) => {
  // Round up to nearest whole number for label lookup
  const roundedScore = Math.ceil(score);
  // Ensure we don't go below 1 or above 10
  const normalizedScore = Math.max(1, Math.min(10, roundedScore));
  return SCORE_LABELS[normalizedScore as keyof typeof SCORE_LABELS];
};

// Function to determine rating color based on score
const getRatingColor = (rating: number | undefined | null) => {
  if (rating === undefined || rating === null) return '#AAAAAA'; // Gray for N/A
  
  // More granular color coding for scores 1-10
  switch (Math.floor(rating)) {
    case 10:
      return '#00FF77'; // Bright green for perfect scores
    case 9:
      return '#40FF88'; // Light green
    case 8:
      return '#80FF99'; // Pale green
    case 7:
      return '#FFDD00'; // Gold
    case 6:
      return '#FFBB33'; // Orange-yellow
    case 5:
      return '#FF9933'; // Dark orange
    case 4:
      return '#FF6633'; // Orange-red
    case 3:
      return '#FF4040'; // Bright red
    case 2:
      return '#E62020'; // Dark red
    case 1:
      return '#CC0000'; // Very dark red
    default:
      return '#AAAAAA'; // Gray for unexpected values
  }
};

// Function to get descriptive text for a score
const getScoreDescription = (score: number) => {
  // Ensure score is within valid range
  const validScore = Math.min(Math.max(score, 0), 10);
  
  if (validScore >= 9.5) return "LEGENDARY";
  if (validScore >= 8.5) return "EXCELLENT";
  if (validScore >= 7.5) return "GREAT";
  if (validScore >= 6.5) return "GOOD";
  if (validScore >= 5.5) return "DECENT";
  if (validScore >= 4.5) return "AVERAGE";
  if (validScore >= 3.5) return "FAIR";
  if (validScore >= 2.5) return "POOR";
  if (validScore >= 1.5) return "BAD";
  if (validScore >= 0.5) return "TERRIBLE";
  return "N/A";
};

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

// Component for the rating progress bar
const RatingProgressBar = ({ rating, setDisplayedTitleScore }: { rating: number, setDisplayedTitleScore?: (score: string) => void }) => {
  // Convert rating to percentage (0-10 scale)
  const percentage = Math.min(Math.max(rating * 10, 0), 100);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState('0.0');
  const animatedColor = useRef(new Animated.Value(0)).current;
  
  // Animate the progress bar on mount
  useEffect(() => {
    // Update the displayed score as the animation progresses
    animatedWidth.addListener(({ value }) => {
      // Convert percentage back to score (0-10 scale)
      const currentScore = (value / 10).toFixed(1);
      setDisplayedScore(currentScore);
      
      // Update the title score if the setter function is provided
      if (setDisplayedTitleScore) {
        setDisplayedTitleScore(currentScore);
      }
    });
    
    Animated.parallel([
      // Animate the width
      Animated.timing(animatedWidth, {
        toValue: percentage,
        duration: 2000, // 2 seconds
        easing: Easing.bezier(0.5, 0, 0.005, 1), // Maximum possible slowdown at the end
        useNativeDriver: false,
      }),
      // Animate the color (from 0 to rating value)
      Animated.timing(animatedColor, {
        toValue: rating,
        duration: 2000, // Same duration as width animation
        easing: Easing.bezier(0.5, 0, 0.005, 1), // Same extreme easing
        useNativeDriver: false,
      })
    ]).start();
    
    // Cleanup listener on unmount
    return () => {
      animatedWidth.removeAllListeners();
    };
  }, [percentage, rating, setDisplayedTitleScore]);
  
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

// Component for a sub-score indicator with short description and score number
const SubScoreIndicator = ({ 
  icon, 
  label, 
  description, 
  score,
  onPress,
  expanded,
  analysisText
}: { 
  icon: string, 
  label: string, 
  description: string, 
  score: number,
  onPress?: () => void,
  expanded?: boolean,
  analysisText?: string
}) => {
  // Function to get the first sentence of the analysis text
  const getFirstSentence = (text: string) => {
    if (!text) return "";
    // Match up to the first period followed by a space or end of string
    const match = text.match(/^.*?\.(?:\s|$)/);
    if (match) {
      return match[0].trim();
    }
    // If no period found, return first 60 chars with ellipsis
    return text.length > 60 ? text.substring(0, 60).trim() + "..." : text.trim();
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.subScoreRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.subScoreTextColumn}>
          <View style={styles.labelRow}>
            <Text style={styles.subScoreEmoji}>{icon}</Text>
            <Text style={styles.subScoreLabel}>{label}</Text>
            {onPress && (
              <Ionicons 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="white" 
                style={styles.expandIcon}
              />
            )}
          </View>
          {!expanded && (
            <Text 
              style={styles.subScoreDescription}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {analysisText ? getFirstSentence(analysisText) : description}
            </Text>
          )}
        </View>
        <View style={styles.subScoreRightColumn}>
          <Text style={styles.subScoreNumber}>{score.toFixed(1)}</Text>
        </View>
      </TouchableOpacity>
      
      {expanded && analysisText && (
        <View style={styles.expandedAnalysis}>
          <Text style={styles.expandedAnalysisText}>{analysisText}</Text>
        </View>
      )}
    </View>
  );
};

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams();
  const outfitId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Use layout effect to set navigation options before render
  useLayoutEffect(() => {
    // Set header options immediately to prevent flicker
    navigation.setOptions({
      headerBackVisible: false,
      title: 'Rating',
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontFamily: 'RobotoMono-Regular',
        fontSize: 18,
        color: 'white',
      },
      headerStyle: {
        backgroundColor: 'black',
      },
      headerTintColor: 'white',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={showMoreOptions}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="ellipsis-vertical" 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      )
    });
  }, [navigation, isDark, router]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { getOutfitWithFeedback, removeOutfit } = useOutfitStore();
  const [outfit, setOutfit] = useState<any>(null);
  
  const [expandedFit, setExpandedFit] = useState(false);
  const [expandedColor, setExpandedColor] = useState(false);
  const [expandedStyle, setExpandedStyle] = useState(false);
  const [displayedTitleScore, setDisplayedTitleScore] = useState('0.0');
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  
  // Add reference for capturing the score card
  const scoreCardRef = useRef<ViewShot>(null);
  const [hasStoragePermission, setHasStoragePermission] = useState(false);
  
  // Fetch outfit details
  useEffect(() => {
    const loadOutfit = async () => {
      try {
        outfitLogger.info('Loading outfit details', { outfitId });
        setIsLoading(true);
        setError(null);
        
        const outfitData = await getOutfitWithFeedback(outfitId);
        
        if (!outfitData) {
          outfitLogger.error('Outfit not found', { outfitId });
          setError('Outfit not found');
          return;
        }
        
        outfitLogger.debug('Outfit loaded successfully', { outfitId });
        setOutfit(outfitData);
      } catch (error: any) {
        outfitLogger.error('Error loading outfit', { error: error.message, outfitId });
        setError(error.message || 'Failed to load outfit details');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOutfit();
  }, [outfitId]);
  
  // Delete outfit
  const confirmDelete = () => {
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to delete this outfit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: deleteOutfit 
        }
      ]
    );
  };
  
  const deleteOutfit = async () => {
    try {
      outfitLogger.info('Deleting outfit', { outfitId });
      setIsDeleting(true);
      
      // Delete feedback first
      const { error: feedbackError } = await supabase
        .from('feedback')
        .delete()
        .eq('outfitid', outfitId);

      if (feedbackError) {
        throw feedbackError;
      }

      // Then delete the outfit
      const { error: outfitError } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId);

      if (outfitError) {
        throw outfitError;
      }

      // Update the outfit store to remove the deleted outfit
      removeOutfit(outfitId);

      outfitLogger.info('Outfit deleted successfully', { outfitId });
      Alert.alert('Success', 'Outfit deleted successfully');
      router.back();
    } catch (error: any) {
      outfitLogger.error('Error deleting outfit', { error: error.message });
      setIsDeleting(false);
      Alert.alert('Error', 'Failed to delete outfit');
    }
  };
  
  // Show more options
  const showMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            confirmDelete();
          }
        }
      );
    } else {
      // For Android, we'll use a custom dialog in a future implementation
      // For now, just show the delete confirmation
      confirmDelete();
    }
  };
  
  // Request storage permission when the component mounts
  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasStoragePermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to save images.',
          [{ text: 'OK' }]
        );
      }
    };
    
    checkPermissions();
  }, []);
  
  // Share outfit function - updated to share an image
  const shareOutfit = async () => {
    try {
      if (!scoreCardRef.current || !scoreCardRef.current.capture) {
        Alert.alert('Error', 'Cannot capture image at this time.');
        return;
      }
      
      // Capture the score card as an image
      const uri = await scoreCardRef.current.capture();
      outfitLogger.info('Captured image for sharing', { uri: uri.substring(0, 30) + '...' });
      
      // Share the image
      await Share.share({
        url: uri, // iOS only
        message: Platform.OS === 'android' ? uri : '', // Android needs the URI in the message
        title: `My ${(outfit.feedback.score || 7.8).toFixed(1)}/10 Outfit Rating - dripmax.ai`
      });
    } catch (error) {
      outfitLogger.error('Error sharing outfit image', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'Failed to share image.');
    }
  };
  
  // Save outfit function - updated to save an image
  const saveOutfit = async () => {
    try {
      if (!hasStoragePermission) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to save images.');
          return;
        }
        setHasStoragePermission(true);
      }
      
      if (!scoreCardRef.current || !scoreCardRef.current.capture) {
        Alert.alert('Error', 'Cannot capture image at this time.');
        return;
      }
      
      // Capture the score card as an image
      const uri = await scoreCardRef.current.capture();
      outfitLogger.info('Captured image for saving', { uri: uri.substring(0, 30) + '...' });
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      const album = await MediaLibrary.getAlbumAsync('Dripmax');
      
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Dripmax', asset, false);
      }
      
      Alert.alert('Success', 'Image saved to your photo library!');
    } catch (error) {
      outfitLogger.error('Error saving outfit image', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'Failed to save image.');
    }
  };
  
  // Function to toggle the image modal
  const toggleImageModal = () => {
    setIsImageModalVisible(!isImageModalVisible);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <View style={[
        styles.container, 
        styles.centerContent,
        { backgroundColor: 'black' }
      ]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[
          styles.loadingText,
          { color: 'white', fontFamily: 'RobotoMono-Regular' }
        ]}>
          Loading outfit details...
        </Text>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={[
        styles.container, 
        styles.centerContent,
        { backgroundColor: 'black' }
      ]}>
        <Text style={[
          styles.errorText,
          { color: 'white', fontFamily: 'RobotoMono-Regular' }
        ]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.button, { marginTop: 16 }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, { fontFamily: 'RobotoMono-Regular' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // No outfit data
  if (!outfit || !outfit.feedback) {
    return (
      <View style={[
        styles.container, 
        styles.centerContent,
        { backgroundColor: 'black' }
      ]}>
        <Text style={[
          styles.errorText,
          { color: 'white', fontFamily: 'RobotoMono-Regular' }
        ]}>
          No feedback available for this outfit.
        </Text>
        <TouchableOpacity 
          style={[styles.button, { marginTop: 16 }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, { fontFamily: 'RobotoMono-Regular' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const { feedback } = outfit;
  const outfitTitle = outfit.title || getScoreLabel(feedback.score || 7.8);
  
  // Mocked data structure based on the screenshots
  // In a real app, this would come from the API
  const mockPerfectFor = [
    "Casual outings", 
    "Art gallery visits", 
    "Street festivals", 
    "Fashion events", 
    "Daytime social gatherings"
  ];
  
  const mockSuggestedItems = [
    "A fitted black turtleneck",
    "A chunky knit scarf",
    "Red statement earrings",
    "Ankle boots",
    "A crossbody bag"
  ];

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: 'black' }
        ]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Top Section with scores and image */}
        <ViewShot 
          ref={scoreCardRef}
          options={{ 
            format: 'jpg', 
            quality: 0.9,
            result: 'tmpfile'
          }}
        >
          <View style={styles.scoreCard}>
            <View style={styles.scoreCardContent}>
              {/* Top section with image and score in a row */}
              <View style={styles.compactTopSection}>
                {/* Left side: Image */}
                <TouchableOpacity 
                  style={styles.compactImageContainer}
                  onPress={toggleImageModal}
                  activeOpacity={0.9}
                >
                  <Image 
                    source={{ uri: getTransformedImageUrl(outfit.photourl, 300, 400) }} 
                    style={styles.prominentOutfitImage} 
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                
                {/* Right side: Title and score */}
                <View style={styles.compactScoreContainer}>
                  <Text style={styles.cardTitle}>{`You're a ${displayedTitleScore}`}</Text>
                  <Text style={styles.cardSubtitle}>{outfitTitle}</Text>
                  
                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <RatingProgressBar 
                      rating={feedback.score || 7.8} 
                      setDisplayedTitleScore={setDisplayedTitleScore}
                    />
                  </View>
                </View>
              </View>
              
              {/* Overall Analysis section moved above subscores */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>REVIEW</Text>
                <Text style={styles.analysisText}>
                  {feedback.overall_feedback || "This outfit blends casual and bold elements, creating a striking street style look. The combination of layers and textures gives it a unique character."}
                </Text>
              </View>
              
              {/* Sub-scores */}
              <View style={styles.compactDivider} />
              
              <SubScoreIndicator 
                icon="👔"
                label="FIT" 
                description="Well Proportioned"
                score={feedback.fit_score || 7.5}
                onPress={() => setExpandedFit(!expandedFit)}
                expanded={expandedFit}
                analysisText={feedback.fit_analysis || "The jacket fits well, creating a structured silhouette, while the loose pants add a relaxed touch. The shirt underneath introduces an additional layer of interest with its extended length."}
              />
              
              <View style={styles.compactSubScoreDivider} />
              
              <SubScoreIndicator 
                icon="🎨"
                label="COLOR" 
                description="Excellent Palette"
                score={feedback.color_score || 8.1}
                onPress={() => setExpandedColor(!expandedColor)}
                expanded={expandedColor}
                analysisText={feedback.color_analysis || "The vibrant red jacket is a standout piece against the more subdued gray pants, creating a strong visual contrast. The striped shirt provides a playful yet cohesive element to the overall look."}
              />
              
              <View style={styles.compactSubScoreDivider} />
              
              {/* Add wordmark at bottom of card */}
              <View style={styles.wordmarkContainer}>
                <Text style={styles.wordmarkText}>dripmax.app</Text>
              </View>
            </View>
          </View>
        </ViewShot>
        
        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={saveOutfit}
          >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={styles.buttonText}>SAVE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={shareOutfit}
          >
            <Ionicons name="paper-plane-outline" size={20} color="white" />
            <Text style={styles.buttonText}>SHARE</Text>
          </TouchableOpacity>
        </View>
        
        {/* Suggested Items */}
        <View style={styles.section}>
          <SectionHeader 
            title="SUGGESTED ITEMS" 
            emoji="🛍️"
          />
          <View style={styles.tagsContainer}>
            {(feedback.item_suggestions || mockSuggestedItems).map((item: string, index: number) => (
              <TagItem key={index} label={item} />
            ))}
          </View>
        </View>
        
        {/* Perfect For */}
        <View style={styles.section}>
          <SectionHeader 
            title="PERFECT FOR" 
            emoji="🎯"
          />
          <View style={styles.tagsContainer}>
            {(feedback.event_suitability || mockPerfectFor).map((event: string, index: number) => (
              <TagItem key={index} label={event} />
            ))}
          </View>
        </View>
        
        {/* Styling Tips */}
        <View style={styles.section}>
          <SectionHeader 
            title="STYLING TIPS" 
            emoji="✨"
          />
          <Text style={[
            styles.sectionText,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {feedback.other_suggestions || "Consider adding a bold lip color to complement the jacket's vibrancy and enhance the overall look."}
          </Text>
        </View>

        {/* App signature for virality */}
        <View style={styles.appSignature}>
          <Text style={styles.signatureText}>dripmax.app</Text>
        </View>
      </ScrollView>
      
      {/* Image Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleImageModal}
      >
        <StatusBar hidden={isImageModalVisible} />
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={toggleImageModal}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
          
          <View style={styles.modalImageContainer}>
            <Image 
              source={{ uri: outfit?.photourl || undefined }} 
              style={styles.modalImage} 
              resizeMode="contain"
            />
          </View>
          
          {/* Optional title at the bottom */}
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitleText}>
              {`${(feedback.score || 7.8).toFixed(1)}/10 - ${outfitTitle}`}
            </Text>
            <Text style={styles.modalSubtitleText}>dripmax.app</Text>
          </View>
        </View>
      </Modal>
    </>
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
    paddingBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  headerButton: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  // New styles for the redesigned card-based layout
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
  // New more compact layout styles
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
    fontSize: 16,
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
    backgroundColor: '#333',
  },
  tagItemText: {
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
    fontWeight: '500',
    color: 'white',
  },
  button: {
    backgroundColor: '#1982C4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  // New app signature for virality
  appSignature: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  signatureText: {
    fontFamily: 'RobotoMono-Regular',
    fontSize: 16,
    color: '#666666',
    letterSpacing: 1,
  },
  // Add wordmark styles
  wordmarkContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  wordmarkText: {
    fontFamily: 'RobotoMono-Regular',
    fontSize: 16,
    color: '#666666',
    letterSpacing: 1,
  },
  // Keep reference to old image container for backward compatibility
  imageContainer: {
    width: '90%',
    alignSelf: 'center',
    aspectRatio: 3/4,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    display: 'none', // Hide the old image container
  },
  outfitImage: {
    width: '100%',
    height: '100%',
    display: 'none', // Hide the old image
  },
  // New styles for sub-scores
  subScoresContainer: {
    display: 'none', // Hide the old sub-scores container
  },
  subScoreContainer: {
    display: 'none', // Hide the old sub-score container
  },
  scoreNumber: {
    display: 'none', // Hide the old score number
  },
  slimProgressContainer: {
    display: 'none', // Hide the old progress container
  },
  // Keep these styles for the progress bar component
  ratingContainer: {
    width: '100%',
    marginBottom: 8,
  },
  ratingBarContainer: {
    height: 40,
    width: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    position: 'relative',
  },
  ratingBackground: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  dividerLine: {
    position: 'absolute',
    top: 10,
    width: 2,
    height: 20,
    backgroundColor: 'black',
    zIndex: 1,
  },
  ratingForeground: {
    position: 'absolute',
    top: 10,
    left: 0,
    height: 20,
    borderRadius: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transform: [{ translateX: 0 }],
    backgroundColor: '#00FF77',
  },
  ratingCircle: {
    position: 'absolute',
    top: 3,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -17 }],
    backgroundColor: '#00FF77',
    borderWidth: 2,
    borderColor: 'black',
    zIndex: 2,
  },
  ratingValue: {
    color: 'black',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  
  // Hidden styles
  topSection: {
    display: 'none', // Hide the old top section
  },
  inCardSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  expandedAnalysis: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 0,
  },
  expandedAnalysisText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#BBBBBB',
    fontFamily: 'RobotoMono-Regular',
  },
  subScoreRightColumn: {
    alignItems: 'flex-end',
  },
  expandIcon: {
    marginLeft: 6,
  },
  // ... existing hidden styles ...
  analysisSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginBottom: 8,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  analysisSection: {
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#BBBBBB',
    fontFamily: 'RobotoMono-Regular',
  },
  // Button styles
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 50, // Pill shape with maximum radius
    flex: 1,
    height: 52, // Matching height with other app buttons
  },
  secondaryButton: {
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#444444',
    marginHorizontal: 6,
  },
  // Add modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 18,
  },
  modalImageContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  modalTitleContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalTitleText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
  },
  modalSubtitleText: {
    color: '#666666',
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
  // Add new styles for prominent image
  prominentImageContainer: {
    width: '100%',
    aspectRatio: 3/4,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#444444',
    display: 'none', // Hide this container
  },
  prominentOutfitImage: {
    width: '100%',
    height: '100%',
  },
  titleScoreContainer: {
    marginBottom: 16,
  },
}); 