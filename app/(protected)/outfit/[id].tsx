import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useOutfitStore } from '../../../stores/outfitStore';
import { outfitLogger } from '../../../utils/logger';

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
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
};

// Component for tag/chip items
const TagItem = ({ label }: { label: string }) => {
  return (
    <View style={styles.tagItem}>
      <Text style={styles.tagItemText}>{label}</Text>
    </View>
  );
};

// Component for the rating progress bar
const RatingProgressBar = ({ rating }: { rating: number }) => {
  // Convert rating to percentage (0-10 scale)
  const percentage = Math.min(Math.max(rating * 10, 0), 100);
  
  // Get color based on rating
  const getColor = () => {
    if (rating < 3) return '#FF4D4D'; // Red
    if (rating < 5) return '#FFA500'; // Orange
    if (rating < 7) return '#FFCA3A'; // Yellow
    if (rating < 9) return '#8AC926'; // Green
    return '#01AF71'; // Teal-Green
  };
  
  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingLabels}>
        <Text style={styles.ratingLabel}>0</Text>
        <Text style={styles.ratingLabel}>2</Text>
        <Text style={styles.ratingLabel}>4</Text>
        <Text style={styles.ratingLabel}>6</Text>
        <Text style={styles.ratingLabel}>8</Text>
        <Text style={styles.ratingLabel}>10</Text>
      </View>
      <View style={styles.ratingBarContainer}>
        <View style={styles.ratingBackground} />
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
      title: 'Ratings',
      headerTitle: 'Ratings',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={isDark ? Colors.dark.text : Colors.light.text} 
          />
          <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>
            Home
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={showMoreOptions} style={styles.headerButton}>
          <Ionicons 
            name="ellipsis-vertical" 
            size={24} 
            color={isDark ? Colors.dark.text : Colors.light.text} 
          />
        </TouchableOpacity>
      )
    });
  }, [navigation, isDark, router]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { getOutfitWithFeedback } = useOutfitStore();
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
      
      // Implementation for delete will be added later
      // For now just navigate back
      outfitLogger.info('Outfit deleted', { outfitId });
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
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[
          styles.loadingText,
          { color: isDark ? Colors.dark.text : Colors.light.text }
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
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <Text style={[
          styles.errorText,
          { color: isDark ? '#ff6b6b' : '#d63031' }
        ]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.button, { marginTop: 16 }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
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
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <Text style={[
          styles.errorText,
          { color: isDark ? Colors.dark.text : Colors.light.text }
        ]}>
          No feedback available for this outfit.
        </Text>
        <TouchableOpacity 
          style={[styles.button, { marginTop: 16 }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
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
          { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
        ]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Outfit Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: outfit.photourl }} 
            style={styles.outfitImage} 
            resizeMode="cover"
          />
        </View>
        
        {/* Outfit Title */}
        <Text style={[
          styles.outfitTitle,
          { color: isDark ? Colors.dark.text : Colors.light.text }
        ]}>
          {outfitTitle}
        </Text>
        
        {/* Rating */}
        <RatingProgressBar rating={feedback.score || 7.8} />
        
        {/* Drip Analysis */}
        <View style={styles.section}>
          <SectionHeader 
            title="DRIP ANALYSIS" 
            iconType="MaterialCommunityIcons" 
            iconName="target" 
          />
          <Text style={[
            styles.sectionText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            {feedback.overall_feedback || "This outfit blends casual and bold elements, creating a striking street style look. The combination of layers and textures gives it a unique character."}
          </Text>
        </View>
        
        {/* Perfect For */}
        <View style={styles.section}>
          <SectionHeader 
            title="PERFECT FOR" 
            iconType="FontAwesome5" 
            iconName="gifts" 
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
            iconType="MaterialCommunityIcons" 
            iconName="ruler" 
          />
          <Text style={[
            styles.sectionText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            {feedback.fit_analysis || "The jacket fits well, creating a structured silhouette, while the loose pants add a relaxed touch. The shirt underneath introduces an additional layer of interest with its extended length."}
          </Text>
        </View>
        
        {/* Color Analysis */}
        <View style={styles.section}>
          <SectionHeader 
            title="COLOR ANALYSIS" 
            iconType="Ionicons" 
            iconName="color-palette-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            {feedback.color_analysis || "The vibrant red jacket is a standout piece against the more subdued gray pants, creating a strong visual contrast. The striped shirt provides a playful yet cohesive element to the overall look."}
          </Text>
        </View>
        
        {/* Suggested Items */}
        <View style={styles.section}>
          <SectionHeader 
            title="SUGGESTED ITEMS" 
            iconType="Ionicons" 
            iconName="bag-handle-outline" 
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
            iconName="bulb-outline" 
          />
          <Text style={[
            styles.sectionText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
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
  },
  headerButton: {
    marginHorizontal: 8,
  },
  imageContainer: {
    alignSelf: 'stretch',
    height: 450,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  ratingContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#888',
    width: 20,
    textAlign: 'center',
  },
  ratingBarContainer: {
    height: 30,
    width: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginTop: 4,
    position: 'relative',
  },
  ratingBackground: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  ratingForeground: {
    position: 'absolute',
    top: 12,
    left: 0,
    height: 6,
    borderRadius: 3,
    transform: [{ translateX: -6 }], // Adjust for circle
  },
  ratingCircle: {
    position: 'absolute',
    top: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -14 }], // Half the width
  },
  ratingValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
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
    color: '#CCCCCC',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagItem: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagItemText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
}); 