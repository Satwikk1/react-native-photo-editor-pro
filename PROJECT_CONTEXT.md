# Project Context: react-native-photo-editor-pro

## Overview
`react-native-photo-editor-pro` is a high-performance, professional-grade photo editing library for React Native. It aims to replicate the native Apple Photos editing experience with smooth transitions, high-fidelity filters, and precise cropping tools.

## Tech Stack
- **Core**: React Native (TypeScript)
- **Rendering**: [React Native Skia](https://shopify.github.io/react-native-skia/) (Hardware accelerated)
- **Animation/Gestures**: [Reanimated 3](https://docs.swmansion.com/react-native-reanimated/) & [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- **Structure**: Monorepo-style with `src/` (library) and `example/` (demo app).

## Design Philosophy
- **Apple-Native Aesthetic**: Minimalist UI, glassmorphism (blurs), haptic-like responsiveness, and SF Pro-inspired typography.
- **Performance First**: All intensive rendering (filters, drawing) happens on the GPU via Skia shaders. Avoid JS-thread bottlenecks.
- **Precision**: Interactions (cropping, dial rotation) should feel "weighted" and accurate.

## Key Architectures
1. **Shader Engine**: Custom GLSL/SkSL shaders for real-time color adjustments.
2. **Unified Dial**: A custom intensity adjustment dial component that scales across different filter types.
3. **Markup Layer**: A persistent drawing layer using Skia paths, optimized for low-latency feedback.
4. **Export Flow**: Offscreen Skia `Canvas` rendering to generate high-resolution results without affecting UI performance.

## AI Agent Guidelines
- **Ask First**: Always ask the developer for architectural direction (Hooks vs. Class Objects) before implementing new logic.
- **Maintain Performance**: Always use `useDerivedValue` and `useAnimatedStyle` for UI updates.
- **Coordinate Systems**: Be mindful of the difference between Screen coordinates, Image coordinates, and Skia Canvas coordinates.
- **Type Safety**: Ensure strict TypeScript usage, especially for Skia and Reanimated props.
- **Documentation**: Any new feature must include a corresponding guide in `docs/architecture/`.
