import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { navigationLogger } from '../../utils/logger';
import ScanningAnimationComponent from '../../components/ScanningAnimationComponent';
import { usePendingImageStore } from '../../stores/pendingImageStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PrePaywallFlowScreen() {
  const router = useRouter();
  const [showAnimation, setShowAnimation] = useState(true);
  const pendingImageUri = usePendingImageStore(state => state.pendingImageUri);

  useEffect(() => {
    navigationLogger.info('[PrePaywallFlowScreen] Mounted, starting preview animation.');
    const animationTimer = setTimeout(() => {
      setShowAnimation(false);
      navigationLogger.info('[PrePaywallFlowScreen] Preview animation duration finished. Navigating to /(auth)/paywall.');
      router.push({
        pathname: '/(auth)/paywall',
        params: { origin: 'initial-capture' },
      });
    }, 3500);

    return () => {
      clearTimeout(animationTimer);
      navigationLogger.info('[PrePaywallFlowScreen] Unmounted, animation timer cleared.');
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Preparing Offers...', 
          headerShown: false, 
        }} 
      />
      <ScanningAnimationComponent
        capturedImageUri={pendingImageUri}
        screenHeight={SCREEN_HEIGHT}
        isActive={showAnimation}
        mode="preview"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
}); 