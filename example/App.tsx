import React, { useState } from 'react';
import { StyleSheet, View, Button, Text, Image, Platform } from 'react-native';
import { PhotoEditor } from 'react-native-photo-editor-pro';

export default function App() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <View style={styles.container}>
      {showEditor ? (
        <View style={styles.editorContainer}>
          <PhotoEditor
            uri="https://picsum.photos/800/1200"
            onCancel={() => setShowEditor(false)}
            onSave={(uri: string) => console.log('Saved:', uri)}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Photo Editor Pro Example</Text>
          <Button title="Open Editor" onPress={() => setShowEditor(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 47 : 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
