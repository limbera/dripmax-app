import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';

// Placeholder data for outfit history
const placeholderOutfits = [
  { id: '1', date: '2023-06-01', rating: '8/10', description: 'Summer casual outfit' },
  { id: '2', date: '2023-06-05', rating: '7/10', description: 'Business casual' },
  { id: '3', date: '2023-06-10', rating: '9/10', description: 'Evening outfit' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderOutfitItem = ({ item }: { item: typeof placeholderOutfits[0] }) => (
    <View style={[
      styles.outfitItem,
      { backgroundColor: isDark ? '#333' : '#f5f5f5' }
    ]}>
      <Text style={[styles.outfitDate, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {item.date}
      </Text>
      <Text style={[styles.outfitRating, { color: isDark ? Colors.dark.tint : Colors.light.tint }]}>
        {item.rating}
      </Text>
      <Text style={[styles.outfitDescription, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      <Text style={[
        styles.title,
        { color: isDark ? Colors.dark.text : Colors.light.text }
      ]}>
        Your Outfit History
      </Text>
      
      <FlatList
        data={placeholderOutfits}
        renderItem={renderOutfitItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  outfitItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  outfitDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  outfitRating: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  outfitDescription: {
    fontSize: 16,
  },
}); 