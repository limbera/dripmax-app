import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchGarments, Garment, getTransformedImageUrl } from '../../../services/supabase';

// Constants for grid layout
const COLUMN_COUNT = 3;
const ITEM_MARGIN = 4;
const screenWidth = Dimensions.get('window').width;
const ITEM_WIDTH = (screenWidth - (2 * 16) - ((COLUMN_COUNT - 1) * ITEM_MARGIN)) / COLUMN_COUNT;

export default function WardrobeScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load garments when component mounts
  useEffect(() => {
    loadGarments();
  }, []);

  // Refresh when navigated to with refresh param
  useEffect(() => {
    if (refresh === 'true') {
      loadGarments();
    }
  }, [refresh]);

  // Function to load garments
  const loadGarments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { garments: garmentsData, error } = await fetchGarments();
      
      if (error) {
        throw error;
      }
      
      if (garmentsData) {
        setGarments(garmentsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load garments');
      Alert.alert('Error', 'Failed to load your wardrobe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGarments();
    setRefreshing(false);
  }, []);

  // Navigate to camera for adding new garment
  const navigateToCamera = () => {
    router.push('/garments/camera');
  };

  // Navigate to garment detail
  const navigateToGarmentDetail = (garmentId: string) => {
    router.push(`/garments/${garmentId}`);
  };

  // Render a single garment item
  const renderItem = ({ item }: { item: Garment }) => {
    // Render a normal garment item
    const originalUrl = item.image_url;
    
    return (
      <TouchableOpacity 
        style={styles.garmentItem}
        activeOpacity={0.7}
        onPress={() => navigateToGarmentDetail(item.id)}
      >
        <Image 
          source={{ uri: originalUrl }} 
          style={styles.garmentImage}
          onError={(e) => {
            console.error('Image load error:', e.nativeEvent.error);
            // If we implement a fallback here in the future, we could do it as:
            // e.currentTarget.src = originalUrl;
          }}
        />
      </TouchableOpacity>
    );
  };

  // Render info card that appears when fewer than 3 garments
  const renderInfoCard = () => (
    <View style={styles.infoCard}>
      <Ionicons name="information-circle-outline" size={24} color="#00FF77" />
      <Text style={styles.infoCardText}>
        Adding items to your wardrobe will improve outfit rating suggestions
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Stack.Screen 
        options={{
          title: 'Wardrobe',
          headerTitle: () => (
            <Text style={styles.headerTitle}>
              Wardrobe
            </Text>
          ),
        }} 
      />
      
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00FF77" />
          </View>
        ) : (
          <>
            <FlatList
              data={garments}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              numColumns={COLUMN_COUNT}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <Text style={styles.pageTitle}>Wardrobe</Text>
              }
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor="#00FF77"
                />
              }
              ListEmptyComponent={null} // We don't need a separate empty component anymore
            />
            
            {/* Show info card only when fewer than 3 garments */}
            {garments.length < 3 && (
              <View style={styles.infoCardContainer}>
                {renderInfoCard()}
              </View>
            )}
          </>
        )}
        
        {/* Floating Add Piece button */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={navigateToCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="add-outline" size={24} color="black" style={styles.buttonIcon} />
          <Text style={styles.addButtonText}>ADD PIECE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  headerTitle: {
    color: 'white',
    fontFamily: 'RobotoMono',
    fontWeight: 'bold',
    fontSize: 18,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 30,
  },
  garmentItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    margin: ITEM_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#00FF77',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    marginLeft: 8,
    fontFamily: 'RobotoMono-Regular',
  },
  dropZoneItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    margin: ITEM_MARGIN,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  dropZoneContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropZoneText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
  },
  infoCardContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF77',
    width: '100%',
  },
  infoCardText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'RobotoMono-Regular',
    flex: 1,
    opacity: 0.9,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 16,
    fontFamily: 'RobotoMono-Regular',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF77',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 