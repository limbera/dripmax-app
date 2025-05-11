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
import ActionButton from '../../../components/ActionButton';
import { trackEvent, trackScreenView } from '@/utils/analytics';
import { ANALYTICS_EVENTS } from '@/services/mixpanel';

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

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Wardrobe Screen');
  }, []);

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
        
        // Track wardrobe size
        trackEvent('Wardrobe Loaded', {
          wardrobe_size: garmentsData.length
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load garments');
      Alert.alert('Error', 'Failed to load your wardrobe. Please try again.');
      
      // Track error
      trackEvent('Error', {
        error_type: 'Wardrobe Load Error',
        error_message: err.message || 'Failed to load garments'
      });
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
    trackEvent(ANALYTICS_EVENTS.GARMENT_ADDED, {
      action: 'start'
    });
    router.push('/garments/camera');
  };

  // Navigate to garment detail
  const navigateToGarmentDetail = (garmentId: string) => {
    trackEvent(ANALYTICS_EVENTS.GARMENT_VIEWED, {
      garment_id: garmentId
    });
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
      
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00FF77" />
          </View>
        ) : (
          <FlatList
            style={[
              styles.container,
              { backgroundColor: 'black' }
            ]}
            contentContainerStyle={styles.gridContainer}
            data={garments}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={COLUMN_COUNT}
            ListHeaderComponent={
              <Text style={styles.pageTitle}>Wardrobe</Text>
            }
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#00FF77"
                colors={['#00FF77']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateCard}>
                  <Image 
                    source={require('../../../assets/images/wardrobe-empty-state.png')} 
                    style={styles.emptyStateImage}
                  />
                  <Text style={styles.emptyStateText}>
                    Add pieces to your wardrobe
                  </Text>
                </View>
              </View>
            }
          />
        )}
        
        {/* Floating Add Piece button - Replaced with Coming Soon */}
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonText}>Feature coming soon...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: 'relative',
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
  gridContainer: {
    padding: 16,
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
  comingSoonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: '#333',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    color: '#AAA',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
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
}); 