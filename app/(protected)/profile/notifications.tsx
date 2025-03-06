import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

import { useAuthStore } from '../../../stores/authStore';
import { 
  NotificationCategory, 
  NotificationPreferences, 
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences
} from '../../../utils/notificationUtils';
import { notificationService } from '../../../services/notifications';

export default function NotificationSettingsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        if (!user) return;
        
        // Check if user has granted notification permissions
        const hasPermission = await notificationService.hasNotificationPermission();
        setPermissionGranted(hasPermission);
        
        if (hasPermission) {
          // Load preferences from database
          const userPreferences = await getNotificationPreferences(user.id);
          setPreferences(userPreferences);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user]);

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      setLoading(true);
      // This will prompt the user for permission
      await notificationService.initialize();
      const hasPermission = await notificationService.hasNotificationPermission();
      setPermissionGranted(hasPermission);
      setLoading(false);
      
      if (!hasPermission) {
        Alert.alert(
          'Notification Permission',
          'Please enable notifications in your device settings to receive updates.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setLoading(false);
    }
  };

  // Toggle master notification switch
  const toggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    
    const newPreferences = { 
      ...preferences, 
      enabled 
    };
    
    setPreferences(newPreferences);
    await saveNotificationPreferences(user.id, newPreferences);
  };

  // Toggle category switch
  const toggleCategory = async (category: NotificationCategory, enabled: boolean) => {
    if (!user) return;
    
    const newPreferences = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: enabled
      }
    };
    
    setPreferences(newPreferences);
    await saveNotificationPreferences(user.id, newPreferences);
  };

  // Function to get readable category name
  const getCategoryName = (category: NotificationCategory): string => {
    switch (category) {
      case NotificationCategory.NEW_FEATURES:
        return 'New Features';
      case NotificationCategory.REMINDERS:
        return 'Reminders';
      case NotificationCategory.MARKETING:
        return 'Marketing & Promotions';
      case NotificationCategory.ACCOUNT:
        return 'Account Updates';
      default:
        return category;
    }
  };

  // Function to get category description
  const getCategoryDescription = (category: NotificationCategory): string => {
    switch (category) {
      case NotificationCategory.NEW_FEATURES:
        return 'Be the first to know about new app features and updates.';
      case NotificationCategory.REMINDERS:
        return 'Get helpful reminders about your outfits and activity.';
      case NotificationCategory.MARKETING:
        return 'Receive special offers, promotions, and marketing messages.';
      case NotificationCategory.ACCOUNT:
        return 'Important information about your account and subscription.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF77" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: () => null,
        }}
      />
      <View style={styles.container}>
        <StatusBar style="light" />
        
        {!permissionGranted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#888" />
            <Text style={styles.permissionTitle}>Enable Notifications</Text>
            <Text style={styles.permissionDesc}>
              Allow notifications to stay updated on your outfits, new features, and important updates.
            </Text>
            <View style={styles.permissionButton} onTouchEnd={requestPermissions}>
              <Text style={styles.permissionButtonText}>Enable Notifications</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.masterSwitch}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchTitle}>All Notifications</Text>
                <Text style={styles.switchDesc}>
                  Enable or disable all notifications
                </Text>
              </View>
              <Switch
                trackColor={{ false: '#333', true: '#a0ffd0' }}
                thumbColor={preferences.enabled ? '#00FF77' : '#f4f3f4'}
                ios_backgroundColor="#333"
                onValueChange={toggleNotifications}
                value={preferences.enabled}
              />
            </View>
            
            <View style={styles.divider} />
            
            {Object.values(NotificationCategory).map((category) => (
              <View key={category} style={styles.categorySwitch}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>{getCategoryName(category)}</Text>
                  <Text style={styles.switchDesc}>
                    {getCategoryDescription(category)}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: '#333', true: '#a0ffd0' }}
                  thumbColor={preferences.categories[category] ? '#00FF77' : '#f4f3f4'}
                  ios_backgroundColor="#333"
                  onValueChange={(enabled) => toggleCategory(category, enabled)}
                  value={preferences.categories[category]}
                  disabled={!preferences.enabled}
                />
              </View>
            ))}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: 'white',
  },
  permissionDesc: {
    fontSize: 16,
    textAlign: 'center',
    color: '#AAA',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#00FF77',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  masterSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categorySwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: 'white',
  },
  switchDesc: {
    fontSize: 14,
    color: '#AAA',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 15,
  },
}); 