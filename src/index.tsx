import React, { useState, useMemo, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { useImage } from "@shopify/react-native-skia";

import { Cropper } from "./components/Cropper";
import { Filters } from "./components/Filters";
import { Adjustments } from "./components/Adjustments";
import { DrawingBoard } from "./components/DrawingBoard";
import { TabButton } from "./components/TabButton";
import { EditorHeader } from "./components/EditorHeader";
import { EditorStateManager } from "./state/EditorStateManager";
import { Toast } from "./components/Toast";
import { isSupportedFormat, convertSkImage } from "./utils/convert";
import { VibrationType, HapticTickType } from "./utils/vibration";
import type { EditorTheme } from "./theme/types";

interface PhotoEditorProps {
  uri: string | number;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
  theme?: EditorTheme;
  exportFormat?: "png" | "jpeg" | "webp";
  exportQuality?: number;
  exportMaxSize?: number;
  visibleTabs?: ("crop" | "filter" | "adjust" | "draw")[];
  customFilters?: { id: string; name: string; matrix?: number[]; effect?: any; category: "original" | "analog" | "cinematic" | "bw" }[];
  replaceDefaultFilters?: boolean;
  enableBeforeAfter?: boolean;
  enableReset?: boolean;
  enableVibration?: boolean;
  vibrationType?: VibrationType;
  onTriggerHaptic?: (type: HapticTickType) => void;
  defaultTab?: "crop" | "filter" | "adjust" | "draw";
}

export const PhotoEditor = ({
  uri,
  onSave,
  onCancel,
  theme,
  exportFormat = "png",
  exportQuality = 100,
  exportMaxSize = 1280,
  visibleTabs = ["adjust", "filter", "crop", "draw"],
  customFilters,
  replaceDefaultFilters = false,
  enableBeforeAfter = true,
  enableReset = true,
  enableVibration = true,
  vibrationType = VibrationType.DEFAULT,
  onTriggerHaptic,
  defaultTab = "filter",
}: PhotoEditorProps) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isValidFormat, setIsValidFormat] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isSaving) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      spinAnim.setValue(0);
      pulseAnim.setValue(0.6);
    }
  }, [isSaving]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    const valid = isSupportedFormat(uri);
    setIsValidFormat(valid);
    if (!valid) {
      setToastMessage("Unsupported image format! Only PNG, JPEG, and WEBP are supported.");
    }
  }, [uri]);

  // Set default active tab on startup
  const initialTab = useMemo(() => {
    if (visibleTabs.includes(defaultTab)) {
      return defaultTab;
    }
    const fallback = visibleTabs.find((t) => t !== "draw");
    return fallback || "filter";
  }, [visibleTabs, defaultTab]);

  const image = useImage(isValidFormat ? uri : undefined);
  const [activeTab, setActiveTab] = useState<
    "crop" | "filter" | "adjust" | "draw" | "edit"
  >(initialTab);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab as any) && activeTab !== "edit") {
      setActiveTab(initialTab);
    }
  }, [visibleTabs, initialTab]);

  // Centralized State Manager (Source of Truth)
  const stateManager = useMemo(() => {
    if (!image) return null;
    return new EditorStateManager(image);
  }, [image]);

  const handleSave = async () => {
    if (stateManager) {
      setIsSaving(true);
      setTimeout(() => {
        try {
          const result = stateManager.generateFinalImage(exportFormat, exportQuality, exportMaxSize);
          if (result && onSave) {
            onSave(result);
          }
        } catch (err) {
          console.error("Save Error:", err);
          setToastMessage("Failed to save changes. Please try again.");
        } finally {
          setIsSaving(false);
        }
      }, 100);
    }
  };

  const handleReset = () => {
    if (stateManager) {
      stateManager.resetAll();
      setResetKey((prev) => prev + 1);
    }
  };

  if (!isValidFormat) {
    return (
      <View style={[styles.container, styles.centered, theme?.background ? { backgroundColor: theme.background } : null]}>
        <Text style={[styles.errorText, theme?.text ? { color: theme.text } : null]}>
          Unsupported Image Format
        </Text>
        <Text style={styles.errorSubtext}>
          Please select a PNG, JPEG/JPG, or WEBP image to edit.
        </Text>
        <TouchableOpacity
          style={[
            styles.backButton,
            theme?.primary ? { backgroundColor: theme.primary } : null,
          ]}
          onPress={onCancel}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>

        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
      </View>
    );
  }

  if (!image || !stateManager) {
    return (
      <View style={[styles.container, styles.centered, theme?.background ? { backgroundColor: theme.background } : null]}>
        <Text style={{ color: "#FFF", fontSize: 16 }}>Loading Image...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, theme?.background ? { backgroundColor: theme.background } : null]}>
      <EditorHeader
        activeTab={activeTab}
        onCancel={onCancel}
        onSave={handleSave}
        onEdit={() => setActiveTab("edit")}
        showDrawOption={visibleTabs.includes("draw")}
        enableBeforeAfter={enableBeforeAfter}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((prev) => !prev)}
        theme={theme}
        enableReset={enableReset}
        onReset={handleReset}
      />

      <View style={[styles.editorContainer, theme?.background ? { backgroundColor: theme.background } : null]}>
        {activeTab === "crop" && (
          <Cropper
            key={resetKey}
            stateManager={stateManager}
            theme={theme}
            showOriginal={showOriginal}
            enableVibration={enableVibration}
            vibrationType={vibrationType}
            onTriggerHaptic={onTriggerHaptic}
          />
        )}
        {activeTab === "filter" && (
          <Filters
            key={resetKey}
            stateManager={stateManager}
            theme={theme}
            showOriginal={showOriginal}
            customFilters={customFilters}
            replaceDefaultFilters={replaceDefaultFilters}
            enableVibration={enableVibration}
            vibrationType={vibrationType}
            onTriggerHaptic={onTriggerHaptic}
          />
        )}
        {activeTab === "adjust" && (
          <Adjustments
            key={resetKey}
            stateManager={stateManager}
            theme={theme}
            showOriginal={showOriginal}
            enableVibration={enableVibration}
            vibrationType={vibrationType}
            onTriggerHaptic={onTriggerHaptic}
          />
        )}
        {activeTab === "edit" && (
          <DrawingBoard
            stateManager={stateManager}
            theme={theme}
            onCancel={() => {
              const backTab = visibleTabs.find((t) => t !== "draw") || "filter";
              setActiveTab(backTab as any);
            }}
            onDone={() => {
              stateManager.commitPaths();
              const backTab = visibleTabs.find((t) => t !== "draw") || "filter";
              setActiveTab(backTab as any);
            }}
          />
        )}
      </View>

      {activeTab !== "edit" && (
        <View style={[styles.footer, theme?.tabBarBackground ? { backgroundColor: theme.tabBarBackground } : null]}>
          {visibleTabs.includes("adjust") && (
            <TabButton
              id="adjust"
              label="Adjust"
              icon="ADJUST"
              activeTab={activeTab}
              onPress={setActiveTab}
              theme={theme}
            />
          )}
          {visibleTabs.includes("filter") && (
            <TabButton
              id="filter"
              label="Filters"
              icon="FILTER"
              activeTab={activeTab}
              onPress={setActiveTab}
              theme={theme}
            />
          )}
          {visibleTabs.includes("crop") && (
            <TabButton
              id="crop"
              label="Crop"
              icon="CROP"
              activeTab={activeTab}
              onPress={setActiveTab}
              theme={theme}
            />
          )}
        </View>
      )}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
      {isSaving && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.overlay, { backgroundColor: theme?.background ? theme.background + 'CC' : 'rgba(0,0,0,0.75)' }]} />
          <View style={styles.loaderContainer}>
            <View style={[styles.loaderCard, { backgroundColor: theme?.tabBarBackground ?? '#1C1C1E', borderColor: theme?.text ? theme.text + '1A' : '#2C2C2E' }]}>
              <Animated.View 
                style={[
                  styles.spinner, 
                  { 
                    transform: [{ rotate: spin }], 
                    borderColor: theme?.primary ?? '#FFD60A',
                    borderLeftColor: 'transparent',
                    borderBottomColor: 'transparent',
                  }
                ]} 
              />
              <Animated.Text style={[styles.loaderText, { color: theme?.text ?? '#FFF', opacity: pulseAnim }]}>
                Saving changes...
              </Animated.Text>
            </View>
          </View>
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
  errorText: {
    color: "#EF4444",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  errorSubtext: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  backButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loaderCard: {
    width: 200,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    marginBottom: 16,
  },
  loaderText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export { isSupportedFormat, convertSkImage } from "./utils/convert";
export { VibrationType, HapticTickType } from "./utils/vibration";
export type { EditorTheme } from "./theme/types";
export type { FilterConfig } from "./components/filters/registry";
