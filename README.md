# 🎨 React Native Photo Editor Pro

A professional-grade, hardware-accelerated photo editor library for React Native and Expo, powered by **React Native Skia** and **React Native Reanimated**. Bring desktop-class, native-feel photo editing directly into your mobile application.

---

## 📸 Screenshots

| 🎨 Adjustments & Shaders | ✂️ Smart Filter & Crop |
| :---: | :---: |
| ![Adjustments](https://raw.githubusercontent.com/Satwikk1/react-native-photo-editor-pro/main/assets/adjust.gif) | ![Filter and Crop](https://raw.githubusercontent.com/Satwikk1/react-native-photo-editor-pro/main/assets/filter%20and%20crop.gif) |

🎬 **[Click here to watch the full Video Demo on GitHub](https://github.com/Satwikk1/react-native-photo-editor-pro)**

---

## 💡 Why React Native Photo Editor Pro?
Developers have always wanted to find a library that could **give users an in-app, native-feel like photo editing experience** in the React Native ecosystem, but most existing packages either require complex native linking, suffer from bridge transfer latency, or lack the fluid responsiveness of modern hardware-accelerated editors. 

`react-native-photo-editor-pro` resolves this by providing:

*   ⚡ **60 FPS Hardware-Accelerated Performance:** Runs intensive image math directly on the GPU using Skia shaders and 4x5 color matrix manipulations.
*   📱 **Native Look & Feel:** Includes smooth haptic-ready slider responses, layout bounds, and transitions built using Reanimated.
*   📐 **Advanced Geometry Engine:** Perform crops, rotations, flips, and true 3D Pitch & Yaw perspective warping.
*   💾 **Zero-Bridge High-Res Export:** Save and output photos directly in memory without sluggish base64 round-trips through the React Native bridge.
*   🛠️ **Granular UI Customization:** Hide tools, inject custom filter registries, apply custom styling templates, and preview changes instantly.
*   🚀 **Android Canvas Minimization & Caching:** Dynamically hides inactive canvas contexts and pre-downscales preview thumbnails, bypassing memory leaks and frame drops on Android.

---

## ✨ Features
*   🎨 **Pro-Grade Adjustments:** Real-time Exposure, Brilliance, Highlights, Shadows, Contrast, Brightness, Saturation, Warmth, and Vignette.
*   ⚡ **Auto-Enhance:** Instant intelligent pixel balancing and exposure tuning using offscreen histogram analysis.
*   ✂️ **Smart Cropping:** Crop tool with standard aspect-ratio presets, rotations, horizontal/vertical flipping, and 3D tilts.
*   ✍️ **Markup Board:** Zero-latency drawing canvas with pressure-responsive brushes and solid colors.
*   ⚙️ **Custom Output Config:** Export to **WEBP (default)**, **PNG**, or **JPEG** with custom compression levels.
*   🔒 **Format Constraints:** Out-of-the-box validation that alerts users of unsupported formats (e.g. GIF, TIFF) with a sleek animated toast.
*   🕹️ **Modular Tool Tabs:** Conditionally load adjustments, filters, cropping, or drawing tools using `visibleTabs`.
*   🌈 **Vibrant Themes:** Theme your workspace dynamically by skinning backgrounds, labels, footer bars, and rulers.
*   👁️ **Before/After Toggle:** Click the "Eye" button in the header (located on the left next to Cancel) to instantly preview changes against the original unedited image.
*   🔄 **One-Tap Reset:** Click the circular rollback button in the header to instantly discard all adjustments, markup, crops, and filters, reverting back to the original image.
*   📳 **Configurable Haptics:** Custom dial tick feedback profiles with Android fine-tick preservation and iOS vibration suppression logic.
*   🛠️ **Standalone Converters:** Import and use validator/converter helpers separately from the UI component.

---

## 📦 Installation
Install the package using your favorite package manager:

```sh
# Using yarn
yarn add react-native-photo-editor-pro

# Using npm
npm install react-native-photo-editor-pro
```

### Peer Dependencies
To ensure hardware-accelerated processing and gestures are handled cleanly, install the following required peers:

```sh
npx expo install @shopify/react-native-skia react-native-reanimated react-native-gesture-handler
```

---

## 🚀 Quick Start

### 1. Render the Photo Editor
Import and mount the `PhotoEditor` component. Pass a source image URI or a local asset requirement.

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PhotoEditor } from 'react-native-photo-editor-pro';

export default function App() {
  return (
    <View style={styles.container}>
      <PhotoEditor
        uri="https://picsum.photos/800/1200"
        exportFormat="webp"      // Select output format ('webp' | 'jpeg' | 'png')
        exportQuality={90}       // Quality/Compression setting (0 - 100)
        onCancel={() => console.log('Edit Cancelled')}
        onSave={(editedUri) => {
          // Returns a base64 Data URI: data:image/webp;base64,...
          console.log('Saved Image Base64:', editedUri);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
```

---

## 🛠️ Advanced Usage & Customization

### 1. Hide Specific Features (`visibleTabs`)
You can decide which editing tools the developer or user has access to. For example, to make a simple cropping tool:

```tsx
<PhotoEditor
  uri={myPhotoUri}
  visibleTabs={["crop"]} // Hides adjustments, filters, and drawing pencil
  onCancel={handleCancel}
  onSave={handleSave}
/>
```

### 2. Inject Custom Filters (`customFilters`)
Pass an array of custom filter matrices or effects. You can choose to append them to the default presets, or replace the defaults completely:

```tsx
import { PhotoEditor, FilterConfig } from 'react-native-photo-editor-pro';

const customSepiaFilter: FilterConfig = {
  id: "vintage_sepia",
  name: "Vintage Sepia",
  matrix: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0,     0,     0,     1, 0,
  ],
  category: "analog" // "analog" | "cinematic" | "bw"
};

<PhotoEditor
  uri={myPhotoUri}
  customFilters={[customSepiaFilter]}
  replaceDefaultFilters={true} // Displays ONLY your custom filter + original
  onCancel={handleCancel}
  onSave={handleSave}
/>
```

### 3. Highly Custom Theme (e.g. Solarized Teal)
Customize the color scheme to fit your application's brand. You can fully customize the slider, ruler colors, buttons, text colors, and layouts using the `EditorTheme` schema:

```tsx
import { PhotoEditor, EditorTheme } from 'react-native-photo-editor-pro';

const solarizedTheme: EditorTheme = {
  // Main Container backgrounds & text colors
  background: "#002B36",
  tabBarBackground: "#073642",
  primary: "#2AA198",
  text: "#93A1A1",

  // Adjustment & Filter Dial Ruler Styling
  rulerBg: "#073642",
  rulerTickActive: "#859900",
  rulerTickInactive: "#586E75",
  rulerPointer: "#CB4B16",

  // Active/Inactive icons and circular button backgrounds
  iconActive: "#2AA198",
  iconInactive: "#586E75",
  toolButtonActiveBg: "#073642",
  toolButtonInactiveBg: "#002B36"
};

<PhotoEditor
  uri={myPhotoUri}
  onCancel={handleCancel}
  onSave={handleSave}
  theme={solarizedTheme}
/>
```

### 4. Independent Converters & Format Checker
Want to convert or validate formats manually without showing the editor UI? Import the helpers directly:

```typescript
import { isSupportedFormat, convertSkImage } from 'react-native-photo-editor-pro';

// 1. Verify if an input URI is supported before rendering/uploading
const checkImage = isSupportedFormat("file:///path/to/my-image.gif"); // returns false (unsupported)

// 2. Encode any Skia SkImage directly to a base64 Data URI
const myBase64Webp = convertSkImage(skImageInstance, 'webp', 85); // data:image/webp;base64,...
```

### 5. Custom Haptic Feedback Integration (`onTriggerHaptic`)
To connect advanced native haptics (like `expo-haptics`) to trigger distinct tick sensations on dial scroll and alignment crossovers:

```tsx
import * as Haptics from 'expo-haptics';
import { PhotoEditor, VibrationType, HapticTickType } from 'react-native-photo-editor-pro';

const MyEditor = () => {
  const handleHaptic = (type: HapticTickType) => {
    switch (type) {
      case HapticTickType.NEUTRAL:
        // Crossover/Alignment (e.g. crossing 0° on straightener)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case HapticTickType.MAJOR:
        // Every 5th ticks on dials
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case HapticTickType.MINOR:
      default:
        // Smaller index ticks
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  };

  return (
    <PhotoEditor
      uri={myImageUri}
      onSave={handleSave}
      onCancel={handleCancel}
      enableVibration={true}
      vibrationType={VibrationType.DEFAULT}
      onTriggerHaptic={handleHaptic}
    />
  );
};
```

---

## 📖 API Reference

### `<PhotoEditor />` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `uri` | `string \| number` | **Required** | Remote URL, local filesystem path (`file://`), base64 data URI, or local require bundle asset resource reference. |
| `onSave` | `(editedUri: string) => void` | **Required** | Callback triggered when saving edits. Returns base64 Data URI string. |
| `onCancel` | `() => void` | **Required** | Callback triggered when the user cancels the session. |
| `exportFormat` | `'webp' \| 'jpeg' \| 'png'` | `'webp'` | Output compression format. WebP is highly optimized for size and speed. |
| `exportQuality` | `number` | `90` | Lossy compression level. Integer value range: `0` to `100`. |
| `visibleTabs` | `('crop' \| 'filter' \| 'adjust' \| 'draw')[]` | `['adjust', 'filter', 'crop', 'draw']` | Array specifying visible footer tool tabs and draw options. |
| `customFilters` | `FilterConfig[]` | `undefined` | Array of user-defined filter presets containing `{ id, name, matrix?, effect?, category }`. |
| `replaceDefaultFilters` | `boolean` | `false` | If true, replaces default built-in filter list with your `customFilters`. |
| `enableBeforeAfter` | `boolean` | `true` | When true, renders an "Eye" button in the header to compare against the original image. |
| `enableReset` | `boolean` | `true` | When true, renders a circular reset icon button in the header next to the comparison button to revert all settings to the original image. |
| `enableVibration` | `boolean` | `true` | When true, triggers haptic feedback/ticks during slider dial scrolling and crop alignment. |
| `vibrationType` | `VibrationType` | `VibrationType.DEFAULT` | Haptic feedback strength profile (see `VibrationType` enum values). |
| `onTriggerHaptic` | `(type: HapticTickType) => void` | `undefined` | Custom haptic trigger callback, allowing developers to inject fine native haptics (like `expo-haptics` or `react-native-haptic-feedback`). |
| `theme` | `EditorTheme` | `undefined` | Custom colors configuration (see `EditorTheme` options). |

---

### `EditorTheme` Options

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `primary` | `string` | `'#FFD60A'` | Accent color for active tabs, selected states, and "Done" button background. |
| `background` | `string` | `'#000000'` | Background color for the editor canvas container. |
| `text` | `string` | `'#FFFFFF'` | Label text color for headers, dial labels, and action links. |
| `tabBarBackground` | `string` | `'#000000'` | Background color for the footer tab bar container. |
| `sliderActive` | `string` | `primary` | Color for selected slider tracks, dial ticks, and active status circles. |
| `sliderInactive` | `string` | `'#2A2A2A'` | Color for unselected dial segments. |
| `rulerBg` | `string` | `background` | Background color of the ruler dials. |
| `rulerTickActive` | `string` | `primary` | Color for the active value tick marker. |
| `rulerTickInactive` | `string` | `text` 40% alpha | Color for major and minor dial ruler tick marks. |
| `rulerPointer` | `string` | `text` | Color for the fixed center value indicator pointer. |
| `iconActive` | `string` | `primary` | Color for active adjustment button icons. |
| `iconInactive` | `string` | `text` 50% alpha | Color for inactive adjustment button icons. |
| `toolButtonActiveBg` | `string` | `background` | Background color for active circular tool buttons. |
| `toolButtonInactiveBg` | `string` | `text` 10% alpha | Background color for inactive circular tool buttons. |

---

### `FilterConfig` Interface

```typescript
export interface FilterConfig {
  id: string; // Unique string identifying the filter
  name: string; // User-facing display name
  matrix?: number[]; // 4x5 color matrix array (20 float values)
  effect?: any; // Custom Skia RuntimeShader source program
  category: "original" | "analog" | "cinematic" | "bw"; // Categorization tab
}
```

---

### `VibrationType` Enum

Determines the built-in haptic pattern strengths triggered on Android/fallback systems:
```typescript
export enum VibrationType {
  NONE = 'NONE',       // Disables haptic vibrations completely
  LIGHT = 'LIGHT',     // Shortest buzzes: Minor (1ms) · Major (4ms) · Neutral (8ms)
  MEDIUM = 'MEDIUM',   // Moderated ticks: Minor (3ms) · Major (8ms) · Neutral (15ms)
  HEAVY = 'HEAVY',     // Pronounced ticks: Minor (6ms) · Major (18ms) · Neutral (30ms)
  DEFAULT = 'DEFAULT', // System standard: Minor (2ms) · Major (6ms) · Neutral (12ms)
}
```

---

### `HapticTickType` Enum

The tick event category sent to `onTriggerHaptic` callback:
```typescript
export enum HapticTickType {
  MINOR = 'MINOR',     // Triggered on every regular dial tick scrolled
  MAJOR = 'MAJOR',     // Triggered when aligning with major tick steps (multiples of 5)
  NEUTRAL = 'NEUTRAL', // Triggered at the neutral point/alignment center lines (e.g. 0° straighten)
}
```

---

## ⚡ Android & RAM Optimizations

### GPU-Accelerated Pipelines
Core canvas rendering runs on top of **React Native Skia** in native C++. Shaders and 4x5 color matrix multiplications are applied directly on the GPU, avoiding the slow JSON bridge serialization.

### Canvas Minimization
In standard editors, rendering multiple canvas contexts concurrently can freeze Android GPU resources. To optimize this:
- **Conditional Canvas Mounting:** Circular progress dials in tool buttons only render their Skia canvases when the tool's adjustment is non-zero. This keeps active canvases at **0–2** instead of **15**.
- **Filter Pre-Downscaling:** The editor generates a small `120px` snapshot of the source photo *once* when loading the filter panel and shares it across all 12 thumbnail previews. This avoids massive texture scaling inside preview scroll panels.

---

## 🛠️ Testing & Running the Example App
To inspect the package interactively, run the local Expo example app:

1.  **Clone and Install dependencies:**
    Ensure `"private": true` is set in the root package.json before running yarn (this is required to prevent Yarn workspace resolution conflicts).
    ```sh
    yarn install
    ```
2.  **Build the parent library:**
    ```sh
    yarn run build
    ```
3.  **Start the Expo development server:**
    ```sh
    cd example
    yarn install
    npx expo start
    ```

---

## 📄 License
This project is licensed under the MIT License.
