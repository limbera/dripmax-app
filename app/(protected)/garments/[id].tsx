import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { fetchGarmentById, deleteGarment, Garment } from '../../../services/supabase';
import { getTimeAgo } from '../../../utils/timeFormatter';

// Section Header Component
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
  // Function to render the correct icon
  const getIcon = () => {
    switch (iconType) {
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={20} color={color} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={iconName as any} size={20} color={color} />;
      case 'Feather':
        return <Feather name={iconName as any} size={20} color={color} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={iconName as any} size={20} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconContainer, { backgroundColor: `${color}20` }]}>
        {getIcon()}
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
};

export default function GarmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load garment data
  useEffect(() => {
    loadGarment();
  }, [id]);

  // Function to load the garment
  const loadGarment = async () => {
    if (!id || typeof id !== 'string') {
      setError('Invalid garment ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { garment: garmentData, error } = await fetchGarmentById(id);

      if (error) {
        throw error;
      }

      if (garmentData) {
        setGarment(garmentData);
      } else {
        setError('Garment not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load garment');
    } finally {
      setLoading(false);
    }
  };

  // Function to confirm deletion
  const confirmDelete = () => {
    Alert.alert(
      'Delete Garment',
      'Are you sure you want to delete this garment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete
        }
      ]
    );
  };

  // Function to delete the garment
  const handleDelete = async () => {
    if (!garment?.id) return;

    try {
      setIsDeleting(true);
      
      const { success, error } = await deleteGarment(garment.id);
      
      if (error) {
        throw error;
      }
      
      if (success) {
        // Navigate to wardrobe tab with refresh
        router.replace({
          pathname: '/(protected)/(tabs)/wardrobe',
          params: { refresh: 'true' }
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete garment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date using the timeFormatter utility
  const formatDate = (dateString: string) => {
    try {
      return getTimeAgo(dateString);
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Garment Details',
            headerTitle: () => (
              <Text style={styles.headerTitle}>
                Garment Details
              </Text>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FF77" />
          <Text style={styles.loadingText}>Loading garment...</Text>
        </View>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Error',
            headerTitle: () => (
              <Text style={styles.headerTitle}>
                Error
              </Text>
            ),
          }} 
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF385C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Main content
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Garment Details',
          headerTitle: () => (
            <Text style={styles.headerTitle}>
              Garment Details
            </Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color="white" 
              />
              <Text style={{ color: 'white', fontFamily: 'RobotoMono-Regular' }}>
                Wardrobe
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={confirmDelete}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={24} color="#FF385C" />
            </TouchableOpacity>
          )
        }} 
      />
      
      {isDeleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.deletingText}>Deleting garment...</Text>
        </View>
      )}
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Garment Image */}
        <View style={styles.imageContainer}>
          {garment?.image_url && (
            <Image 
              source={{ uri: garment.image_url }} 
              style={styles.image}
              resizeMode="contain"
            />
          )}
        </View>
        
        {/* Garment Details */}
        <View style={styles.detailsContainer}>
          {/* Category */}
          <View style={styles.section}>
            <SectionHeader 
              title="Category" 
              iconType="MaterialCommunityIcons" 
              iconName="tshirt-crew"
              color="#00FF77"
            />
            <Text style={styles.sectionContent}>
              {garment?.category || 'Uncategorized'}
            </Text>
          </View>
          
          {/* Date Added */}
          <View style={styles.section}>
            <SectionHeader 
              title="Date Added" 
              iconType="Ionicons" 
              iconName="calendar" 
              color="#00FF77"
            />
            <Text style={styles.sectionContent}>
              {garment?.created_at ? formatDate(garment.created_at) : 'Unknown'}
            </Text>
          </View>
          
          {/* Tags (if available) */}
          {garment?.tags && garment.tags.length > 0 && (
            <View style={styles.section}>
              <SectionHeader 
                title="Tags" 
                iconType="Ionicons" 
                iconName="pricetag" 
                color="#00FF77"
              />
              <View style={styles.tagsContainer}>
                {garment.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* AI Analysis Section */}
          {(garment?.type || garment?.brand || garment?.primary_color || 
            garment?.pattern || garment?.material || garment?.fit_style || 
            garment?.price_range) && (
            <View style={styles.section}>
              <SectionHeader 
                title="AI Analysis" 
                iconType="MaterialCommunityIcons" 
                iconName="brain" 
                color="#4A90E2"
              />
              
              <View style={styles.aiAnalysisContainer}>
                {/* Type */}
                {garment?.type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{garment.type}</Text>
                  </View>
                )}
                
                {/* Brand */}
                {garment?.brand && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Brand:</Text>
                    <Text style={styles.detailValue}>{garment.brand}</Text>
                  </View>
                )}
                
                {/* Primary Color */}
                {garment?.primary_color && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Primary Color:</Text>
                    <View style={styles.colorContainer}>
                      <View 
                        style={[
                          styles.colorSwatch, 
                          { backgroundColor: garment.primary_color.toLowerCase() }
                        ]} 
                      />
                      <Text style={styles.detailValue}>{garment.primary_color}</Text>
                    </View>
                  </View>
                )}
                
                {/* Secondary Colors */}
                {garment?.secondary_colors && garment.secondary_colors.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Secondary Colors:</Text>
                    <View style={styles.colorsContainer}>
                      {garment.secondary_colors.map((color, index) => (
                        <View key={index} style={styles.colorItem}>
                          <View 
                            style={[
                              styles.colorSwatch, 
                              { backgroundColor: color.toLowerCase() }
                            ]} 
                          />
                          <Text style={styles.detailValue}>{color}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Pattern */}
                {garment?.pattern && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pattern:</Text>
                    <Text style={styles.detailValue}>{garment.pattern}</Text>
                  </View>
                )}
                
                {/* Material */}
                {garment?.material && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Material:</Text>
                    <Text style={styles.detailValue}>{garment.material}</Text>
                  </View>
                )}
                
                {/* Size Range */}
                {garment?.size_range && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Size Range:</Text>
                    <Text style={styles.detailValue}>{garment.size_range}</Text>
                  </View>
                )}
                
                {/* Fit Style */}
                {garment?.fit_style && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fit Style:</Text>
                    <Text style={styles.detailValue}>{garment.fit_style}</Text>
                  </View>
                )}
                
                {/* Price Range */}
                {garment?.price_range && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Est. Price Range:</Text>
                    <Text style={styles.detailValue}>{garment.price_range}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Color (if available) */}
          {garment?.color && (
            <View style={styles.section}>
              <SectionHeader 
                title="Color" 
                iconType="Ionicons" 
                iconName="color-palette" 
                color="#00FF77"
              />
              <Text style={styles.sectionContent}>
                {garment.color}
              </Text>
            </View>
          )}
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
  contentContainer: {
    paddingBottom: 40,
  },
  headerTitle: {
    color: 'white',
    fontFamily: 'RobotoMono',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    marginTop: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#00FF77',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'black',
    fontFamily: 'RobotoMono-Regular',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  deletingText: {
    marginTop: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 16,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  sectionContent: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginLeft: 40,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 40,
  },
  tag: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  aiAnalysisContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorItem: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
}); 