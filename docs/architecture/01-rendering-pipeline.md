# Rendering Pipeline & Best Practices

This document outlines the rendering philosophy and best practices for `react-native-photo-editor-pro`.

## 1. Skia Rendering Model
We use **React Native Skia** for all image processing and UI overlays. The goal is to keep as much work as possible on the GPU.

### Principles:
- **Imperative vs. Declarative**: Use the declarative Skia API (`<Canvas>`, `<Image>`, `<ColorMatrix>`) for the main preview. Use the imperative API (`Skia.Canvas`) only for high-res exports.
- **Shader-Based Filters**: All filters (Brightness, Contrast, Saturation) MUST be implemented using Skia shaders or `ColorMatrix`. Never manipulate pixel data manually in JavaScript.
- **Layering**: Keep the "Background Image", "Filters", and "Markup (Drawing)" in separate logical layers to minimize redraw regions.

## 2. Performance Best Practices
Agents MUST ensure that every change maintains 60/120 FPS.

### Do's:
- Use `useImage` from Skia to load images efficiently.
- Use `useDerivedValue` to bridge Reanimated Shared Values to Skia props.
- Use `useSharedValue` for any property that changes frequently (e.g., filter intensity).
- Pre-compile shaders where possible to avoid frame drops on the first interaction.

### Don'ts:
- **No `setState` in loops**: Never use standard React `useState` for values that update during a gesture.
- **Avoid Heavy Re-renders**: The `<PhotoEditor>` component should rarely re-render. Only the Skia `<Canvas>` should update via Reanimated.
- **Image Resolution**: Be careful with large images. Use `resizeMode="contain"` during editing and only process the full resolution during the `onSave` step.

## 3. High-Resolution Export
To save the image:
1. Create an offscreen `SkCanvas` with the full image dimensions.
2. Apply the same transformations (crop, rotate) and filters (shaders) used in the preview.
3. Use `canvas.makeImageSnapshot()` to get a `SkImage`.
4. Encode to PNG/JPG and return the local URI.
