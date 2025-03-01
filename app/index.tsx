import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, initialized } = useAuth();

  useEffect(() => {
    if (initialized) {
      if (isAuthenticated) {
        console.log('[INDEX] Redirecting to protected area');
        router.replace('/(protected)');
      } else {
        console.log('[INDEX] Redirecting to login');
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, initialized, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
}); 