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
  Alert
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchGarments, Garment, getTransformedImageUrl } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_MARGIN = 4;
const ITEM_WIDTH = (width - (ITEM_MARGIN * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

export default function GarmentsScreen() {
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
    // Try both approaches - get the transformed URL but fallback to original 
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

  // Render empty state when no garments
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="shirt-outline" size={80} color="#00FF77" />
        <Text style={styles.emptyTitle}>Your Wardrobe is Empty</Text>
        <Text style={styles.emptyText}>
          Start building your collection by adding garments.
        </Text>
        <TouchableOpacity 
          style={styles.emptyStateButton}
          onPress={navigateToCamera}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.emptyButtonText}>Add Garment</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
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
          <FlatList
            data={garments}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#00FF77"
              />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* Floating Action Button */}
        {garments.length > 0 && (
          <TouchableOpacity 
            style={styles.fab} 
            onPress={navigateToCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="black" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    padding: ITEM_MARGIN,
    flexGrow: 1,
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
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF77',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00FF77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
}); 