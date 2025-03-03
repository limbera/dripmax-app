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

// Function to determine progress bar color based on rating
const getRatingColor = (rating: number) => {
  if (rating <= 2) return '#FF4D4D'; // Red for very low scores
  if (rating <= 4) return '#FF8C42'; // Orange for low scores
  if (rating <= 6) return '#FFCA3A'; // Yellow for medium scores
  if (rating <= 8) return '#8AC926'; // Green for good scores
  return '#1982C4'; // Teal/Blue for excellent scores
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
        { backgroundColor: isDark ? '#333' : '#f5f5f5' }
      ]}
      onPress={() => navigateToOutfitDetail(item.id)}
      activeOpacity={0.7}
    >
      {/* Horizontal layout with image on left, content on right */}
      <View style={styles.outfitItemContent}>
        {/* Outfit thumbnail image */}
        <Image 
          source={{ uri: item.photourl }} 
          style={styles.outfitImage} 
        />
        
        {/* Outfit details */}
        <View style={styles.outfitDetails}>
          {/* Rating score and timestamp in the same row */}
          <View style={styles.scoreRow}>
            {/* Rating score */}
            <Text style={[styles.outfitRating, { color: isDark ? Colors.dark.tint : Colors.light.tint }]}>
              {item.feedback?.score || 'N/A'}/10
            </Text>
            
            {/* Timestamp formatted as relative time */}
            <Text style={[styles.outfitDate, { color: isDark ? '#aaa' : '#777' }]}>
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
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[
          styles.loadingText,
          { color: isDark ? Colors.dark.text : Colors.light.text }
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
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
      ]}>
        <Text style={[
          styles.errorText,
          { color: isDark ? '#ff6b6b' : '#d63031' }
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
          { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
        ]}
        contentContainerStyle={styles.listContent}
        data={outfits}
        renderItem={renderOutfitItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[isDark ? Colors.dark.tint : Colors.light.tint]}
            tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
          />
        }
        ListEmptyComponent={
          <Text style={[
            styles.emptyText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            No outfits yet. Take a photo to get started!
          </Text>
        }
      />
    );
  }

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen
        options={{
          title: "My Drips",
          headerLargeTitle: false,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(protected)/profile')}
              style={{ marginRight: 8 }}
            >
              <Ionicons 
                name="person-circle-outline" 
                size={28} 
                color={isDark ? Colors.dark.tint : Colors.light.tint} 
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      {content}

      {/* Floating Action Button for Camera */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }
        ]}
        onPress={navigateToCamera}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
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
    height: 70,
    borderRadius: 12,
    marginRight: 16,
  },
  outfitDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  outfitDate: {
    fontSize: 14,
  },
  outfitRating: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    paddingTop: 32,
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