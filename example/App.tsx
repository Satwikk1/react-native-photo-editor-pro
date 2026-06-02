import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { PhotoEditor } from "react-native-photo-editor-pro";

// Define our list of test images (supported and unsupported)
const TEST_IMAGES = [
  {
    label: "Remote JPEG (Random Picsum)",
    uri: "https://picsum.photos/800/1200",
    description: "Supported remote image",
  },
  {
    label: "Local JPEG Asset",
    uri: require("./assets/sample.jpg"),
    description: "Supported local JPEG",
  },
  {
    label: "Local PNG Asset",
    uri: require("./assets/sample.png"),
    description: "Supported local PNG",
  },
  {
    label: "Local WEBP Asset",
    uri: require("./assets/sample.webp"),
    description: "Supported local WEBP",
  },
  {
    label: "Remote TIFF Image (Unsupported)",
    uri: "https://raw.githubusercontent.com/ianare/exif-samples/master/tiff/test-suite/gray-ticks-1byte.tif",
    description: "Will trigger warning toast & fallback UI",
  },
];

// Custom Filter Matrix Configurations
const RETRO_SEPIA_MATRIX = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0,     0,     0,     1, 0,
];

const DEEP_BLUE_MATRIX = [
  0.5, 0,   0,   0, 0,
  0,   0.7, 0,   0, 0,
  0,   0,   1.4, 0, 0,
  0,   0,   0,   1, 0,
];

const CUSTOM_DREAMY_FILTERS = [
  {
    id: "retro_sepia",
    name: "Retro Sepia",
    matrix: RETRO_SEPIA_MATRIX,
    category: "analog",
  },
  {
    id: "deep_blue",
    name: "Deep Blue Ice",
    matrix: DEEP_BLUE_MATRIX,
    category: "cinematic",
  },
];

// Theme configurations
const THEMES = {
  default: {
    background: "#000000",
    tabBarBackground: "#121212",
    primary: "#FFD60A",
    text: "#FFFFFF",
    sliderActive: "#FFD60A",
  },
  purple: {
    background: "#0F0F13",
    tabBarBackground: "#1E1E24",
    primary: "#8B5CF6",
    text: "#FFF",
    sliderActive: "#8B5CF6",
  },
  solarized: {
    background: "#002B36",
    tabBarBackground: "#073642",
    primary: "#2AA198",
    text: "#93A1A1",
    sliderActive: "#2AA198",
    rulerBg: "#073642",
    rulerTickActive: "#859900",
    rulerTickInactive: "#586E75",
    rulerPointer: "#CB4B16",
    iconActive: "#2AA198",
    iconInactive: "#586E75",
    toolButtonActiveBg: "#073642",
    toolButtonInactiveBg: "#002B36",
  },
  sunset: {
    background: "#1A0F0F",
    tabBarBackground: "#2D1919",
    primary: "#F97316",
    text: "#FDE047",
    sliderActive: "#F97316",
    rulerBg: "#2D1919",
    rulerTickActive: "#F43F5E",
    rulerTickInactive: "#7C2D12",
    rulerPointer: "#FACC15",
    iconActive: "#F97316",
    iconInactive: "#7C2D12",
    toolButtonActiveBg: "#2D1919",
    toolButtonInactiveBg: "#1A0F0F",
  },
};

export default function App() {
  const [showEditor, setShowEditor] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | number>(
    TEST_IMAGES[0].uri
  );

  // Feature controls
  const [showAdjust, setShowAdjust] = useState(true);
  const [showFilter, setShowFilter] = useState(true);
  const [showCrop,   setShowCrop]   = useState(true);
  const [showDraw,   setShowDraw]   = useState(true);

  // Format controls
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("webp");
  const [quality, setQuality] = useState(90);

  // Custom filters configuration
  const [injectCustomFilters, setInjectCustomFilters] = useState(false);
  const [replaceWithCustomFilters, setReplaceWithCustomFilters] = useState(false);

  // Theme selection
  const [activeThemeKey, setActiveThemeKey] = useState<keyof typeof THEMES>("default");

  // Stats
  const [savedFormat, setSavedFormat] = useState<string | null>(null);
  const [savedSize, setSavedSize] = useState<number | null>(null);

  // Vibration controls
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [vibrationType, setVibrationType] = useState<"NONE" | "LIGHT" | "MEDIUM" | "HEAVY" | "DEFAULT">("DEFAULT");

  // Build visible tabs array dynamically
  const visibleTabs = React.useMemo(() => {
    const tabs: ("adjust" | "filter" | "crop" | "draw")[] = [];
    if (showAdjust) tabs.push("adjust");
    if (showFilter) tabs.push("filter");
    if (showCrop) tabs.push("crop");
    if (showDraw) tabs.push("draw");
    return tabs;
  }, [showAdjust, showFilter, showCrop, showDraw]);

  const handleOpenEditor = (uri: string | number) => {
    setSelectedImage(uri);
    setShowEditor(true);
  };

  const handleSave = (uri: string) => {
    setEditedImage(uri);
    setShowEditor(false);

    // Calculate approximate size in KB
    const approxBytes = uri.length * 0.75;
    setSavedSize(Math.round(approxBytes / 1024));

    // Detect format from data uri
    const match = uri.match(/^data:image\/(\w+);base64/);
    if (match && match[1]) {
      setSavedFormat(match[1].toUpperCase());
    }
  };

  const activeTheme = THEMES[activeThemeKey];

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      {showEditor ? (
        <View style={styles.editorContainer}>
          <PhotoEditor
            uri={selectedImage}
            exportFormat={format}
            exportQuality={quality}
            visibleTabs={visibleTabs}
            customFilters={injectCustomFilters ? CUSTOM_DREAMY_FILTERS : undefined}
            replaceDefaultFilters={replaceWithCustomFilters}
            enableBeforeAfter={true}
            onCancel={() => setShowEditor(false)}
            onSave={handleSave}
            theme={activeThemeKey === "default" ? undefined : activeTheme}
            enableVibration={vibrationEnabled}
            vibrationType={vibrationType as any}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: activeTheme.text }]}>
            📸 Photo Editor Pro
          </Text>
          <Text style={styles.subtitle}>
            Skia-powered customizable Native Editor
          </Text>

          {/* Theme Selector */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Choose Editor Theme
            </Text>
            <View style={styles.btnRow}>
              {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((tKey) => (
                <TouchableOpacity
                  key={tKey}
                  style={[
                    styles.selectorBtn,
                    activeThemeKey === tKey ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary } : null,
                  ]}
                  onPress={() => setActiveThemeKey(tKey)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      activeThemeKey === tKey ? { color: "#FFF" } : null,
                    ]}
                  >
                    {tKey.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Visible Tabs Config */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Customize Visible Features
            </Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Adjust Tool</Text>
              <Switch
                value={showAdjust}
                onValueChange={setShowAdjust}
                thumbColor={showAdjust ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Filters Tool</Text>
              <Switch
                value={showFilter}
                onValueChange={setShowFilter}
                thumbColor={showFilter ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Crop Tool</Text>
              <Switch
                value={showCrop}
                onValueChange={setShowCrop}
                thumbColor={showCrop ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Draw Tool (Pencil)</Text>
              <Switch
                value={showDraw}
                onValueChange={setShowDraw}
                thumbColor={showDraw ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>
          </View>

          {/* Filters Config */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Custom Filters Configuration
            </Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Inject Dreamy Custom Filters</Text>
              <Switch
                value={injectCustomFilters}
                onValueChange={setInjectCustomFilters}
                thumbColor={injectCustomFilters ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Replace Default Filters List</Text>
              <Switch
                disabled={!injectCustomFilters}
                value={replaceWithCustomFilters}
                onValueChange={setReplaceWithCustomFilters}
                thumbColor={replaceWithCustomFilters ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>
          </View>

          {/* Haptic Feedback Config */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Haptic Feedback Config
            </Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Haptic Ticks</Text>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                thumbColor={vibrationEnabled ? activeTheme.primary : "#94A3B8"}
                trackColor={{ false: "#475569", true: `${activeTheme.primary}80` }}
              />
            </View>

            {vibrationEnabled && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Haptic Strength / Profile</Text>
                <View style={styles.btnRow}>
                  {(["LIGHT", "MEDIUM", "HEAVY", "DEFAULT"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.selectorBtn,
                        vibrationType === type ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary } : null,
                      ]}
                      onPress={() => setVibrationType(type)}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          vibrationType === type ? { color: "#FFF" } : null,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Configuration Settings */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Export Configuration
            </Text>

            {/* Format Selector */}
            <Text style={styles.label}>Output Format</Text>
            <View style={styles.btnRow}>
              {(["webp", "jpeg", "png"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.selectorBtn,
                    format === f ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary } : null,
                  ]}
                  onPress={() => setFormat(f)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      format === f ? { color: "#FFF" } : null,
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quality Selector */}
            <Text style={styles.label}>Compression Quality: {quality}%</Text>
            <View style={styles.btnRow}>
              {([10, 50, 80, 100] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.selectorBtn,
                    quality === q ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary } : null,
                  ]}
                  onPress={() => setQuality(q)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      quality === q ? { color: "#FFF" } : null,
                    ]}
                  >
                    {q}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Test Image Selector */}
          <View style={[styles.card, { backgroundColor: activeTheme.tabBarBackground }]}>
            <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
              Choose Image to Edit
            </Text>
            {TEST_IMAGES.map((item, index) => {
              const isSelected = selectedImage === item.uri;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.imageRowBtn,
                    isSelected ? { borderColor: activeTheme.primary } : null,
                  ]}
                  onPress={() => setSelectedImage(item.uri)}
                >
                  <View style={styles.imageRowLeft}>
                    <Text
                      style={[
                        styles.imageRowLabel,
                        isSelected ? { color: "#FFF" } : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.imageRowDesc}>{item.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      isSelected ? { borderColor: activeTheme.primary, backgroundColor: activeTheme.primary } : null,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Result Preview */}
          {editedImage && (
            <View style={[styles.previewCard, { backgroundColor: activeTheme.tabBarBackground }]}>
              <Text style={[styles.cardTitle, { color: activeTheme.text }]}>
                Edited Output Preview
              </Text>
              <View style={{ width: "100%", height: 250 }}>
                <Image
                  source={{ uri: editedImage }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={[styles.formatBadge, { backgroundColor: activeTheme.primary }]}>
                  <Text style={styles.formatBadgeText}>{savedFormat}</Text>
                </View>
              </View>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  Format: <Text style={styles.boldText}>{savedFormat}</Text>
                </Text>
                <Text style={styles.statsText}>
                  Approx Size: <Text style={styles.boldText}>{savedSize} KB</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setEditedImage(null);
                  setSavedFormat(null);
                  setSavedSize(null);
                }}
              >
                <Text style={styles.resetBtnText}>Clear Result</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: activeTheme.primary }]}
              onPress={() => handleOpenEditor(selectedImage)}
            >
              <Text style={styles.primaryBtnText}>Open Editor</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 25,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
    fontWeight: "600",
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: "#0F0F13",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#334155",
  },
  switchLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  imageRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F0F13",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  imageRowLeft: {
    flex: 1,
    paddingRight: 10,
  },
  imageRowLabel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  imageRowDesc: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#475569",
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  previewImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    backgroundColor: "#0F0F13",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
    marginBottom: 12,
  },
  statsText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  boldText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  resetBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionSection: {
    width: "100%",
    marginTop: 10,
    marginBottom: 30,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  editorContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  formatBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  formatBadgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
