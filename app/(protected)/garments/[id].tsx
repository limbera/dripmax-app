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
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { fetchGarmentById, deleteGarment, Garment } from '../../../services/supabase';
import { getTimeAgo } from '../../../utils/timeFormatter';

// Section Header Component
const SectionHeader = ({ 
  title, 
  iconType, 
  iconName,
  color = '#00FF77'
}: { 
  title: string, 
  iconType: 'Ionicons' | 'MaterialCommunityIcons' | 'Feather' | 'FontAwesome5' | 'AntDesign', 
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
      case 'AntDesign':
        return <AntDesign name={iconName as any} size={20} color={color} />;
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

// Color Dot Component for visualizing colors
const ColorDot = ({ color, label }: { color: string, label?: string }) => (
  <View style={styles.colorDotContainer}>
    <View 
      style={[
        styles.colorDot, 
        { backgroundColor: color.toLowerCase() }
      ]} 
    />
    {label && <Text style={styles.colorLabel}>{label}</Text>}
  </View>
);

// Collapsible Section Component
const CollapsibleSection = ({ 
  title, 
  iconType, 
  iconName,
  children,
  initiallyExpanded = true
}: { 
  title: string, 
  iconType: 'Ionicons' | 'MaterialCommunityIcons' | 'Feather' | 'FontAwesome5' | 'AntDesign', 
  iconName: string,
  children: React.ReactNode,
  initiallyExpanded?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity 
        style={styles.collapsibleHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <SectionHeader 
          title={title}
          iconType={iconType}
          iconName={iconName}
        />
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#00FF77" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
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
            title: '',
            headerStyle: {
              backgroundColor: 'black',
            },
            headerTintColor: 'white',
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
            title: '',
            headerStyle: {
              backgroundColor: 'black',
            },
            headerTintColor: 'white',
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
          title: '',
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

        <View style={styles.detailsContainer}>
          {/* Basic Garment Info */}
          <View style={styles.basicInfoContainer}>
            <View style={styles.garmentTypeContainer}>
              <Text style={styles.garmentCategory}>{garment?.category?.toUpperCase() || 'UNCATEGORIZED'}</Text>
              {garment?.type && (
                <Text style={styles.garmentType}>{garment.type}</Text>
              )}
            </View>
            
            {garment?.brand && (
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{garment.brand}</Text>
              </View>
            )}
          </View>

          {/* Date Added */}
          <Text style={styles.dateText}>
            Added {garment?.created_at ? formatDate(garment.created_at) : 'Unknown'}
          </Text>

          <View style={styles.divider} />
          
          {/* Colors Section */}
          {(garment?.primary_color || garment?.secondary_colors?.length) && (
            <CollapsibleSection 
              title="Colors" 
              iconType="Ionicons" 
              iconName="color-palette" 
            >
              <View style={styles.colorsContainer}>
                {garment?.primary_color && (
                  <View style={styles.colorSection}>
                    <ColorDot 
                      color={garment.primary_color} 
                      label={garment.primary_color}
                    />
                    <Text style={styles.colorTitle}>Primary</Text>
                  </View>
                )}
                
                {garment?.secondary_colors && garment.secondary_colors.length > 0 && (
                  <View style={styles.colorSection}>
                    <View style={styles.secondaryColorsRow}>
                      {garment.secondary_colors.map((color, index) => (
                        <ColorDot key={index} color={color} label={color} />
                      ))}
                    </View>
                    <Text style={styles.colorTitle}>Secondary</Text>
                  </View>
                )}
              </View>
            </CollapsibleSection>
          )}

          {/* Appearance Section */}
          {(garment?.pattern || garment?.material) && (
            <CollapsibleSection 
              title="Appearance" 
              iconType="MaterialCommunityIcons" 
              iconName="eye-outline" 
            >
              <View style={styles.appearanceContainer}>
                {garment?.pattern && (
                  <View style={styles.appearanceItem}>
                    <Text style={styles.appearanceLabel}>Pattern:</Text>
                    <Text style={styles.appearanceValue}>{garment.pattern}</Text>
                  </View>
                )}
                
                {garment?.material && (
                  <View style={styles.appearanceItem}>
                    <Text style={styles.appearanceLabel}>Material:</Text>
                    <Text style={styles.appearanceValue}>{garment.material}</Text>
                  </View>
                )}
              </View>
            </CollapsibleSection>
          )}

          {/* Fit & Size Section */}
          {(garment?.size_range || garment?.fit_style) && (
            <CollapsibleSection 
              title="Fit & Size" 
              iconType="MaterialCommunityIcons" 
              iconName="human" 
            >
              <View style={styles.fitSizeContainer}>
                {garment?.size_range && (
                  <View style={styles.fitSizeItem}>
                    <Text style={styles.fitSizeLabel}>Size Range:</Text>
                    <Text style={styles.fitSizeValue}>{garment.size_range}</Text>
                  </View>
                )}
                
                {garment?.fit_style && (
                  <View style={styles.fitSizeItem}>
                    <Text style={styles.fitSizeLabel}>Fit Style:</Text>
                    <Text style={styles.fitSizeValue}>{garment.fit_style}</Text>
                  </View>
                )}
              </View>
            </CollapsibleSection>
          )}

          {/* Value Section */}
          {garment?.price_range && (
            <CollapsibleSection 
              title="Value" 
              iconType="FontAwesome5" 
              iconName="money-bill-wave" 
            >
              <View style={styles.priceContainer}>
                <Text style={styles.priceValue}>{garment.price_range}</Text>
                <Text style={styles.priceLabel}>Estimated Price Range</Text>
              </View>
            </CollapsibleSection>
          )}
          
          {/* Tags Section */}
          {garment?.tags && garment.tags.length > 0 && (
            <CollapsibleSection 
              title="Tags" 
              iconType="Ionicons" 
              iconName="pricetag" 
            >
              <View style={styles.tagsContainer}>
                {garment.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </CollapsibleSection>
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
  basicInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  garmentTypeContainer: {
    flex: 1,
  },
  garmentCategory: {
    color: '#00FF77',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  garmentType: {
    color: 'white',
    fontFamily: 'RobotoMono-Bold',
    fontSize: 24,
  },
  brandBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  brandText: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
  },
  dateText: {
    color: '#999',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
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
  },
  collapsibleSection: {
    marginBottom: 16,
    backgroundColor: '#121212',
    borderRadius: 8,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  collapsibleContent: {
    padding: 16,
    paddingTop: 0,
  },
  colorsContainer: {
    marginTop: 8,
  },
  colorSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  colorTitle: {
    color: '#999',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    marginTop: 8,
  },
  secondaryColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorDotContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  colorLabel: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  appearanceContainer: {
    marginTop: 8,
  },
  appearanceItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  appearanceLabel: {
    color: '#999',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    width: 80,
  },
  appearanceValue: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    flex: 1,
  },
  fitSizeContainer: {
    marginTop: 8,
  },
  fitSizeItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fitSizeLabel: {
    color: '#999',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    width: 90,
  },
  fitSizeValue: {
    color: 'white',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  priceValue: {
    color: 'white',
    fontFamily: 'RobotoMono-Bold',
    fontSize: 20,
    marginBottom: 8,
  },
  priceLabel: {
    color: '#999',
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
  },
}); 