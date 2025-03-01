import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [image, setImage] = useState<string | null>(null);

  // Placeholder functions for camera functionality
  const takePhoto = () => {
    console.log('Taking photo...');
    // In a real implementation, this would use expo-camera to take a photo
  };

  const selectFromGallery = () => {
    console.log('Selecting from gallery...');
    // In a real implementation, this would use expo-image-picker to select from gallery
  };

  const analyzeOutfit = () => {
    console.log('Analyzing outfit...');
    // In a real implementation, this would send the image to OpenAI for analysis
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      <Text style={[
        styles.title,
        { color: isDark ? Colors.dark.text : Colors.light.text }
      ]}>
        Capture Your Outfit
      </Text>
      
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={[
            styles.placeholderImage,
            { backgroundColor: isDark ? '#333' : '#f5f5f5' }
          ]}>
            <Ionicons name="camera" size={64} color={isDark ? '#555' : '#ccc'} />
            <Text style={{ color: isDark ? '#555' : '#ccc', marginTop: 8 }}>
              No image selected
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? '#333' : '#f5f5f5' }
          ]}
          onPress={takePhoto}
        >
          <Ionicons name="camera" size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
          <Text style={[
            styles.buttonText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            Take Photo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? '#333' : '#f5f5f5' }
          ]}
          onPress={selectFromGallery}
        >
          <Ionicons name="images" size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
          <Text style={[
            styles.buttonText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            Gallery
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[
          styles.analyzeButton,
          { 
            backgroundColor: image ? (isDark ? Colors.dark.tint : Colors.light.tint) : (isDark ? '#555' : '#ccc'),
            opacity: image ? 1 : 0.5
          }
        ]}
        onPress={analyzeOutfit}
        disabled={!image}
      >
        <Text style={styles.analyzeButtonText}>
          Analyze Outfit
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3/4,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: '45%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analyzeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 