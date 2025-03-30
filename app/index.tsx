import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  if (isLoading || isSubscriptionLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <ActivityIndicator size="large" color="#00FF77" />
        <Text style={{ marginTop: 20, color: 'white', fontFamily: 'RobotoMono-Regular' }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (hasActiveSubscription) {
    return <Redirect href="/(protected)" />;
  }

  return <Redirect href="/(onboarding)/capture" />;
} 