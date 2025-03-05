import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import * as FaceDetector from 'expo-face-detector';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

interface MultiPersonDetectorProps {
  imageUri: string;
  onMultipleDetected: (hasMultiple: boolean) => void;
  threshold?: number; // Number of faces to consider as "multiple people"
}

export default function MultiPersonDetector({ 
  imageUri, 
  onMultipleDetected,
  threshold = 1 // Default: more than 1 face is considered multiple people
}: MultiPersonDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  useEffect(() => {
    if (imageUri) {
      detectMultiplePeople(imageUri);
    }
  }, [imageUri]);

  const detectMultiplePeople = async (uri: string) => {
    try {
      setIsAnalyzing(true);
      
      // Process the image to ensure it's in a format FaceDetector can handle
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }], // Resize for better performance
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Use the face detector to find faces in the image
      const result = await FaceDetector.detectFacesAsync(processedImage.uri, {
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
        minDetectionInterval: 0,
      });
      
      // Check if multiple faces were detected
      const hasMultiplePeople = result.faces.length > threshold;
      
      // Clean up the processed image to save space
      if (processedImage.uri !== uri) {
        await FileSystem.deleteAsync(processedImage.uri, { idempotent: true });
      }
      
      // Notify the parent component
      onMultipleDetected(hasMultiplePeople);
      
    } catch (error) {
      console.error('Error detecting faces:', error);
      // In case of error, assume it's okay to proceed
      onMultipleDetected(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return isAnalyzing ? (
    <View style={styles.container}>
      <Text style={styles.text}>Analyzing photo...</Text>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  }
}); 