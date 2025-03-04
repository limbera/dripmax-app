import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { getTimeAgo } from '../../utils/timeFormatter';
import { useOutfitStore, OutfitWithFeedback } from '../../stores/outfitStore';
import { Ionicons } from '@expo/vector-icons';
import { getTransformedImageUrl } from '../../services/supabase';

// Function to determine progress bar color based on rating
const getRatingColor = (rating: number) => {
  return '#00FF77'; // Changed to always return the requested color
};

export default function HomeScreen() {
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

  // Navigate to camera screen
  const navigateToCamera = () => {
    router.push(`/(protected)/camera`);
  };

  const renderOutfitItem = ({ item }: { item: OutfitWithFeedback }) => (
    <TouchableOpacity 
      style={[
        styles.outfitItem,
      ]}
      onPress={() => navigateToOutfitDetail(item.id)}
      activeOpacity={0.7}
    >
      {/* Horizontal layout with image on left, content on right */}
      <View style={styles.outfitItemContent}>
        {/* Outfit thumbnail image */}
        <Image 
          source={{ uri: getTransformedImageUrl(item.photourl, 70, 94) }} 
          style={styles.outfitImage} 
        />
        
        {/* Outfit details */}
        <View style={styles.outfitDetails}>
          {/* Rating score and timestamp in the same row */}
          <View style={styles.scoreRow}>
            {/* Rating score */}
            <Text style={[styles.outfitRating, { color: 'white', fontFamily: 'RobotoMono-Regular' }]}>
              {item.feedback?.score || 'N/A'}
            </Text>
            
            {/* Timestamp formatted as relative time */}
            <Text style={[styles.outfitDate, { color: 'white', fontFamily: 'RobotoMono-Regular' }]}>
              {getTimeAgo(item.timestamp)}
            </Text>
          </View>
          
          {/* Progress bar */}
          {item.feedback && (
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${item.feedback.score * 10}%`, 
                    backgroundColor: getRatingColor(item.feedback.score) 
                  }
                ]} 
              />
            </View>
          )}
        </View>
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
        contentContainerStyle={styles.listContent}
        data={outfits}
        renderItem={renderOutfitItem}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.emptyTitle}>
              No drips yet
            </Text>
            <Text style={styles.emptyText}>
              Take photos of your outfits to get ratings and feedback
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={navigateToCamera}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyStateButtonText}>TAKE A PHOTO</Text>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="chevron-forward-outline" size={24} color="black" />
              </View>
            </TouchableOpacity>
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: 'black' }]}>
      <Stack.Screen
        options={{
          title: "My Drips",
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
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(protected)/profile')}
              style={{ marginRight: 8 }}
            >
              <Ionicons 
                name="happy" 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      {content}

      {/* Floating Action Button for Camera - Only show when there are outfits */}
      {outfits.length > 0 && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: '#00FF77' }
          ]}
          onPress={navigateToCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={28} color="#000" />
        </TouchableOpacity>
      )}
    </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 32,
    fontFamily: 'RobotoMono-Regular',
    color: 'white',
    opacity: 0.8,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF77',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 50,
    marginTop: 24,
    width: '100%',
    position: 'relative',
  },
  emptyStateButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
  },
  emptyStateIconContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    right: 20,
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  }
}); 