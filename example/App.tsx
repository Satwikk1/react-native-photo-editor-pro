import React, { useState } from 'react';
import { StyleSheet, View, Button, Text, Image, Platform } from 'react-native';
import { PhotoEditor } from 'react-native-photo-editor-pro';

export default function App() {
  const [showEditor, setShowEditor] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {showEditor ? (
        <View style={styles.editorContainer}>
          <PhotoEditor
            uri={editedImage || "https://picsum.photos/800/1200"}
            onCancel={() => setShowEditor(false)}
            onSave={(uri: string) => {
              setEditedImage(uri);
              setShowEditor(false);
            }}
            theme={{ primary: "#8B5CF6" }}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Photo Editor Pro Example</Text>
          {editedImage && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: editedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <Button
                title="Reset Image"
                color="#EF4444"
                onPress={() => setEditedImage(null)}
              />
            </View>
          )}
          <View style={styles.buttonSpacer} />
          <Button
            title={editedImage ? "Edit Result Again" : "Open Editor"}
            onPress={() => setShowEditor(true)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000ff",
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  previewImage: {
    width: 300,
    height: 400,
    marginBottom: 20,
    borderRadius: 10,
  },
  previewContainer: {
    alignItems: "center",
  },
  buttonSpacer: {
    height: 10,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
});
