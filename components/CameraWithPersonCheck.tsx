import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import MultiPersonDetector from './MultiPersonDetector';

export default function CameraWithPersonCheck() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>(CameraType.back);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const cameraRef = useRef<Camera>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      setCapturedImage(photo.uri);
    }
  };

  const handleMultipleDetection = (hasMultiple: boolean) => {
    if (hasMultiple) {
      Alert.alert(
        "Multiple People Detected",
        "We detected more than one person in your photo. For best results, please take a photo with just yourself.",
        [
          {
            text: "Retry",
            onPress: () => {
              setCapturedImage(null);
            },
            style: "cancel"
          },
          {
            text: "Continue Anyway",
            onPress: () => {
              // Process the image anyway
              console.log("User chose to continue with multiple people");
              // Here you would handle the image as normal
              setCapturedImage(null); // Reset for demo purposes
            }
          }
        ]
      );
    } else {
      // No multiple people detected, proceed normally
      console.log("Single person photo accepted");
      // Process the image
      setTimeout(() => {
        // Reset for demo purposes
        setCapturedImage(null);
      }, 2000);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.previewContainer}>
          <MultiPersonDetector 
            imageUri={capturedImage} 
            onMultipleDetected={handleMultipleDetection} 
          />
        </View>
      ) : (
        <Camera 
          style={styles.camera} 
          type={type}
          ref={cameraRef}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => {
                setType(
                  type === CameraType.back
                    ? CameraType.front
                    : CameraType.back
                );
              }}>
              <Text style={styles.buttonText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureIcon} />
            </TouchableOpacity>
          </View>
        </Camera>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 