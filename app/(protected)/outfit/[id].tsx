import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useOutfitStore } from '../../../stores/outfitStore';
import { outfitLogger } from '../../../utils/logger';
import { getTransformedImageUrl, supabase } from '../../../services/supabase';

// Score labels based on rating
const SCORE_LABELS = {
  1: 'Delete Account Immediately',
  2: 'Eyes Bleeding Send Help',
  3: 'Who Did This To You??',
  4: 'Emotional Damage x100',
  5: 'Mid + Ratio + No Drip',
  6: 'The Effort Was There...',
  7: 'Starting To Get Iconic',
  8: 'Absolutely Slaying FR',
  9: 'Main Character Moment',
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

// Component for a section header with icon
const SectionHeader = ({ 
  title, 
  iconType, 
  iconName,
  color = '#FF385C'
}: { 
  title: string, 
  iconType: 'Ionicons' | 'MaterialCommunityIcons' | 'Feather' | 'FontAwesome5', 
  iconName: string,
  color?: string
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const getIcon = () => {
    switch (iconType) {
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={18} color={color} style={styles.sectionIcon} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={iconName as any} size={18} color={color} style={styles.sectionIcon} />;
      case 'Feather':
        return <Feather name={iconName as any} size={18} color={color} style={styles.sectionIcon} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={iconName as any} size={18} color={color} style={styles.sectionIcon} />;
      default:
        return <Ionicons name={iconName as any} size={18} color={color} style={styles.sectionIcon} />;
    }
  };
  
  return (
    <View style={styles.sectionHeaderContainer}>
      {getIcon()}
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
const RatingProgressBar = ({ rating }: { rating: number }) => {
  // Convert rating to percentage (0-10 scale)
  const percentage = Math.min(Math.max(rating * 10, 0), 100);
  
  // Get color based on rating
  const getColor = () => {
    return '#00FF77'; // Always return this color
  };
  
  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingBarContainer}>
        <View style={styles.ratingBackground} />
        
        {/* Divider lines */}
        <View style={[styles.dividerLine, { left: '20%' }]} />
        <View style={[styles.dividerLine, { left: '40%' }]} />
        <View style={[styles.dividerLine, { left: '60%' }]} />
        <View style={[styles.dividerLine, { left: '80%' }]} />
        
        <View 
          style={[
            styles.ratingForeground, 
            { 
              width: `${percentage}%`,
              backgroundColor: getColor()
            }
          ]} 
        />
        <View style={[styles.ratingCircle, { left: `${percentage}%`, backgroundColor: getColor() }]}>
          <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
        </View>
      </View>
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
      title: 'dripmax',
      headerTitle: () => (
        <Text style={{
          fontFamily: 'RobotoMono',
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: '#00FF77',
          fontSize: 24,
        }}>
          dripmax
        </Text>
      ),
      headerStyle: {
        backgroundColor: 'black',
      },
      headerTintColor: 'white',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color="white" 
          />
          <Text style={{ color: 'white', fontFamily: 'RobotoMono-Regular' }}>
            Drips
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={showMoreOptions} style={styles.headerButton}>
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
        {/* Outfit Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: getTransformedImageUrl(outfit.photourl, 400, 600) }} 
            style={styles.outfitImage} 
            resizeMode="cover"
          />
        </View>
        
        {/* Wrapper for title and rating to match section alignment */}
        <View style={[styles.section, { backgroundColor: 'transparent' }]}>
          {/* Outfit Title */}
          <Text style={[
            styles.outfitTitle,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {outfitTitle}
          </Text>
          
          {/* Rating */}
          <RatingProgressBar rating={feedback.score || 7.8} />
        </View>
        
        {/* Drip Analysis */}
        <View style={styles.section}>
          <SectionHeader 
            title="DRIP ANALYSIS" 
            iconType="Ionicons" 
            iconName="water-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {feedback.overall_feedback || "This outfit blends casual and bold elements, creating a striking street style look. The combination of layers and textures gives it a unique character."}
          </Text>
        </View>
        
        {/* Perfect For */}
        <View style={styles.section}>
          <SectionHeader 
            title="PERFECT FOR" 
            iconType="Ionicons" 
            iconName="today-outline" 
          />
          <View style={styles.tagsContainer}>
            {(feedback.event_suitability || mockPerfectFor).map((event: string, index: number) => (
              <TagItem key={index} label={event} />
            ))}
          </View>
        </View>
        
        {/* Fit Analysis */}
        <View style={styles.section}>
          <SectionHeader 
            title="FIT ANALYSIS" 
            iconType="Ionicons" 
            iconName="build-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {feedback.fit_analysis || "The jacket fits well, creating a structured silhouette, while the loose pants add a relaxed touch. The shirt underneath introduces an additional layer of interest with its extended length."}
          </Text>
        </View>
        
        {/* Color Analysis */}
        <View style={styles.section}>
          <SectionHeader 
            title="COLOR ANALYSIS" 
            iconType="Ionicons" 
            iconName="brush-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {feedback.color_analysis || "The vibrant red jacket is a standout piece against the more subdued gray pants, creating a strong visual contrast. The striped shirt provides a playful yet cohesive element to the overall look."}
          </Text>
        </View>
        
        {/* Suggested Items */}
        <View style={styles.section}>
          <SectionHeader 
            title="SUGGESTED ITEMS" 
            iconType="Ionicons" 
            iconName="bag-add-outline" 
          />
          <View style={styles.tagsContainer}>
            {(feedback.item_suggestions || mockSuggestedItems).map((item: string, index: number) => (
              <TagItem key={index} label={item} />
            ))}
          </View>
        </View>
        
        {/* Styling Tips */}
        <View style={styles.section}>
          <SectionHeader 
            title="STYLING TIPS" 
            iconType="Ionicons" 
            iconName="rocket-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: 'white', fontFamily: 'RobotoMono-Regular' }
          ]}>
            {feedback.other_suggestions || "Consider adding a bold lip color to complement the jacket's vibrancy and enhance the overall look."}
          </Text>
        </View>
      </ScrollView>
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
    marginHorizontal: 8,
  },
  imageContainer: {
    width: '90%',
    alignSelf: 'center',
    aspectRatio: 3/4,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 20,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  ratingContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  ratingBarContainer: {
    height: 50,
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
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  dividerLine: {
    position: 'absolute',
    top: 10,
    width: 2,
    height: 24,
    backgroundColor: 'black',
    zIndex: 1,
  },
  ratingForeground: {
    position: 'absolute',
    top: 10,
    left: 0,
    height: 24,
    borderRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transform: [{ translateX: -6 }], // Adjust for circle
    backgroundColor: '#00FF77',
  },
  ratingCircle: {
    position: 'absolute',
    top: 5,
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
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#222222',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
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
    marginTop: 4,
  },
  tagItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#333',
  },
  tagItemText: {
    fontSize: 13,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  button: {
    backgroundColor: '#1982C4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
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
}); 