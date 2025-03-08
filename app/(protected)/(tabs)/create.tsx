import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CreateScreen() {
  // This screen won't be used directly as we're overriding the tab press
  // but we need it to exist for the routing system
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'RobotoMono-Regular',
  },
}); 