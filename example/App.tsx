import React, { useState } from 'react';
import { StyleSheet, View, Button, SafeAreaView, StatusBar, Text } from 'react-native';
import { PhotoEditor } from '../src';

export default function App() {
  const [showEditor, setShowEditor] = useState(false);

  // Reliable remote test image
  const testImageUri = "https://picsum.photos/1000/1500";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {!showEditor ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Photo Editor Pro</Text>
          <Button 
            title="Open Editor" 
            onPress={() => setShowEditor(true)} 
          />
        </View>
      ) : (
        <PhotoEditor
          uri={testImageUri}
          onSave={(editedUri) => {
            console.log("Photo Saved!");
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  }
});
