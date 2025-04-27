import React from 'react';
import { View, TouchableOpacity, StyleSheet, Share, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { trackOutfitActions } from '@/utils/analytics';

type OutfitShareActionsProps = {
  outfitId: string;
  imageUrl: string;
  onShare?: () => void;
  onSave?: () => void;
};

const OutfitShareActions: React.FC<OutfitShareActionsProps> = ({ 
  outfitId, 
  imageUrl, 
  onShare, 
  onSave 
}) => {
  const handleShare = async () => {
    try {
      const shareMessage = `Check out my outfit on Dripmax! 🔥\n\nhttps://dripmax.app/outfit/${outfitId}`;
      const result = await Share.share({
        message: shareMessage,
        url: imageUrl, // iOS only
      });
      
      if (result.action === Share.sharedAction) {
        // Track the share action with method
        const shareMethod = result.activityType || 'unknown';
        trackOutfitActions.shared(outfitId, shareMethod);
        
        // Call the onShare callback if provided
        if (onShare) onShare();
      }
    } catch (error) {
      console.error('Error sharing outfit:', error);
      Alert.alert('Sharing Error', 'Unable to share your outfit at this time.');
    }
  };
  
  const handleSave = async () => {
    try {
      // Request permission to save to media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to save this outfit.'
        );
        return;
      }
      
      // Download the image
      const fileUri = `${FileSystem.cacheDirectory}outfit_${outfitId}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Save to media library
        const asset = await MediaLibrary.saveToLibraryAsync(fileUri);
        
        // Track successful save
        trackOutfitActions.saved(outfitId);
        
        // Call the onSave callback if provided
        if (onSave) onSave();
        
        Alert.alert('Success', 'Outfit saved to your photo library!');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error saving outfit:', error);
      Alert.alert('Save Error', 'Unable to save your outfit at this time.');
    }
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleShare}>
        <Ionicons name="share-outline" size={24} color="#00FF77" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Ionicons name="download-outline" size={24} color="#00FF77" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
});

export default OutfitShareActions; 