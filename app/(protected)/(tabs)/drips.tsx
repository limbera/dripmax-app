import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { getTimeAgo } from '../../../utils/timeFormatter';
import { useOutfitStore, OutfitWithFeedback } from '../../../stores/outfitStore';
import { Ionicons } from '@expo/vector-icons';
import { getTransformedImageUrl } from '../../../services/supabase';
import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import ActionButton from '../../../components/ActionButton';

// Get screen dimensions for grid layout
const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SPACING = 4;
const ITEM_SIZE = (width - (2 * 16) - ((COLUMN_COUNT - 1) * ITEM_SPACING)) / COLUMN_COUNT;

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

// Function to determine progress bar color based on rating
const getProgressBarColor = (rating: number) => {
  return '#00FF77'; // Changed to always return the requested color
};

export default function DripsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  // Use the outfit store
  const { 
    outfits, 
    isLoading, 
    isRefreshing, 
    error, 
    fetchOutfits, 
    refreshOutfits 
  } = useOutfitStore();

  const [permission, requestPermission] = useCameraPermissions();

  // Fetch outfits when component mounts
  useEffect(() => {
    fetchOutfits();
  }, []);

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    refreshOutfits();
  }, [refreshOutfits]);

  // Navigate to outfit details
  const navigateToOutfitDetail = (outfitId: string) => {
    router.push(`/outfit/${outfitId}`);
  };

  // Navigate to camera screen with permission handling
  const navigateToCamera = async () => {
    try {
      // Check current permission status
      if (!permission?.granted) {
        // Request permission
        const { granted } = await requestPermission();
        if (granted) {
          // If permission is granted, navigate to camera
          router.push('/(protected)/camera');
        }
        // If not granted, the alert is shown by expo-camera
      } else {
        // Permission already granted, navigate directly
        router.push('/(protected)/camera');
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  };

  const renderOutfitItem = ({ item }: { item: OutfitWithFeedback }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => navigateToOutfitDetail(item.id)}
      activeOpacity={0.7}
    >
      {/* Outfit image */}
      <Image 
        source={{ uri: getTransformedImageUrl(item.photourl, 300, 300) }} 
        style={styles.gridItemImage} 
      />
      
      {/* Rating badge overlay */}
      <View style={styles.ratingBadge}>
        <Text style={[
          styles.ratingText,
          { color: getRatingColor(item.feedback?.score) }
        ]}>
          {item.feedback?.score || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Content to render based on state
  let content;

  // Show loading state
  if (isLoading && !isRefreshing && outfits.length === 0) {
    content = (
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
          Loading outfits...
        </Text>
      </View>
    );
  }
  // Show error state
  else if (error && outfits.length === 0) {
    content = (
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
      </View>
    );
  }
  // Show outfits list
  else {
    content = (
      <FlatList
        style={[
          styles.container,
          { backgroundColor: 'black' }
        ]}
        contentContainerStyle={styles.gridContainer}
        data={outfits}
        renderItem={renderOutfitItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>Outfit Analysis</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#00FF77']}
            tintColor={'#00FF77'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <Image 
                source={require('../../../assets/images/drips-empty-state.png')} 
                style={styles.emptyStateImage}
              />
              <Text style={styles.emptyStateText}>
                Get your ratings and recommendations
              </Text>
            </View>
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: 'black' }]}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Stack.Screen
        options={{
          title: "Drips",
          headerLargeTitle: false,
          headerStyle: {
            backgroundColor: 'black',
          },
          headerTintColor: 'white',
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
        }}
      />
      
      {content}
      
      {/* Floating Begin Scan button */}
      <ActionButton
        label="BEGIN SCAN"
        onPress={navigateToCamera}
        animation="chevron-sequence"
        style={styles.floatingButton}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  outfitItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outfitItemContent: {
    flexDirection: 'row',
  },
  outfitImage: {
    width: 70,
    height: 93.3, // Changed to maintain 3:4 aspect ratio (70 width ÷ 3 × 4 = 93.3)
    borderRadius: 12,
    marginRight: 16,
  },
  outfitDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  outfitDate: {
    fontSize: 16,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  outfitRating: {
    fontSize: 32,
    fontWeight: '600',
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  progressBarContainer: {
    height: 16,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 0,
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#00FF77',
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
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyStateCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  emptyStateText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 24,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'left',
    paddingLeft: 8,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF77',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  rateButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_SPACING / 2,
    position: 'relative',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
}); 