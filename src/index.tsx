import React, { useState, useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useImage } from "@shopify/react-native-skia";

import { Cropper } from "./components/Cropper";
import { Filters } from "./components/Filters";
import { Adjustments } from "./components/Adjustments";
import { DrawingBoard } from "./components/DrawingBoard";
import { TabButton } from "./components/TabButton";
import { EditorHeader } from "./components/EditorHeader";
import { EditorStateManager } from "./state/EditorStateManager";

interface PhotoEditorProps {
  uri: string;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
  theme?: {
    primary?: string;
    background?: string;
    text?: string;
  };
}

export const PhotoEditor = ({
  uri,
  onSave,
  onCancel,
  theme,
}: PhotoEditorProps) => {
  const image = useImage(uri);
  const [activeTab, setActiveTab] = useState<
    "crop" | "filter" | "adjust" | "draw" | "edit"
  >("filter");

  // Centralized State Manager (Source of Truth)
  const stateManager = useMemo(() => {
    if (!image) return null;
    return new EditorStateManager(image);
  }, [image]);

  const handleSave = async () => {
    if (stateManager) {
      const result = stateManager.generateFinalImage();
      if (result && onSave) {
        onSave(result);
      }
    }
  };

  if (!image || !stateManager) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: "#FFF", fontSize: 16 }}>Loading Image...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditorHeader
        activeTab={activeTab}
        onCancel={onCancel}
        onSave={handleSave}
        onEdit={() => setActiveTab("edit")}
        theme={theme}
      />

      <View style={styles.editorContainer}>
        {activeTab === "crop" && (
          <Cropper stateManager={stateManager} theme={theme} />
        )}
        {activeTab === "filter" && (
          <Filters stateManager={stateManager} theme={theme} />
        )}
        {activeTab === "adjust" && (
          <Adjustments stateManager={stateManager} theme={theme} />
        )}
        {activeTab === "edit" && (
          <DrawingBoard
            stateManager={stateManager}
            theme={theme}
            onCancel={() => setActiveTab("crop")}
            onDone={() => {
              stateManager.commitPaths();
              setActiveTab("adjust");
            }}
          />
        )}
      </View>

      {activeTab !== "edit" && (
        <View style={styles.footer}>
          <TabButton
            id="adjust"
            label="Adjust"
            icon="ADJUST"
            activeTab={activeTab}
            onPress={setActiveTab}
            theme={theme}
          />
          <TabButton
            id="filter"
            label="Filters"
            icon="FILTER"
            activeTab={activeTab}
            onPress={setActiveTab}
            theme={theme}
          />
          <TabButton
            id="crop"
            label="Crop"
            icon="CROP"
            activeTab={activeTab}
            onPress={setActiveTab}
            theme={theme}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  editorContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  footer: {
    height: 110,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    paddingBottom: 25,
  },
});
