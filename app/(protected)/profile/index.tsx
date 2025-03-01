import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      <View style={[
        styles.profileHeader,
        { backgroundColor: isDark ? '#333' : '#f5f5f5' }
      ]}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={isDark ? Colors.dark.tint : Colors.light.tint} />
        </View>
        
        <Text style={[
          styles.userName,
          { color: isDark ? Colors.dark.text : Colors.light.text }
        ]}>
          {user?.email || 'User'}
        </Text>
        
        <Text style={[
          styles.userEmail,
          { color: isDark ? '#aaa' : '#777' }
        ]}>
          {user?.email || 'No email available'}
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[
            styles.statNumber,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            0
          </Text>
          <Text style={[
            styles.statLabel,
            { color: isDark ? '#aaa' : '#777' }
          ]}>
            Outfits
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[
            styles.statNumber,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            0
          </Text>
          <Text style={[
            styles.statLabel,
            { color: isDark ? '#aaa' : '#777' }
          ]}>
            Average Rating
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.signOutButton,
          { backgroundColor: isDark ? '#333' : '#f5f5f5' }
        ]}
        onPress={signOut}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={isDark ? Colors.dark.tint : Colors.light.tint} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            <Text style={[
              styles.signOutText,
              { color: isDark ? Colors.dark.tint : Colors.light.tint }
            ]}>
              Sign Out
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 'auto',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 