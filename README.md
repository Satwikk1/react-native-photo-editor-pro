# react-native-photo-editor-pro

A professional-grade, high-performance photo editor for React Native, powered by **React Native Skia** and **Reanimated**.

npm - https://www.npmjs.com/package/react-native-photo-editor-pro

## Demo

![Photo Editor Pro Demo - Adjustments](https://raw.githubusercontent.com/Satwikk1/react-native-photo-editor-pro/main/assets/adjust.gif)
![Photo Editor Pro Demo - Filter and Crop](https://raw.githubusercontent.com/Satwikk1/react-native-photo-editor-pro/main/assets/filter%20and%20crop.gif)

## Features

- 🎨 **Pro Adjustments**: Real-time Exposure, Brilliance, Highlights, Shadows, Contrast, and more using 4x5 Color Matrices and Skia Shaders.
- ✂️ **Geometric Transform**: Advanced crop with 3D Pitch/Yaw perspective, rotation, and flipping.
- ✍️ **Markup & Drawing**: Smooth, hardware-accelerated freehand drawing with customizable brushes.
- 🚀 **Full-Res Export**: High-fidelity base64 export at the original image resolution, bypassing the bridge for maximum speed.
- 📱 **Native Feel**: iOS-inspired UI with haptic-ready slider feedback and smooth Reanimated transitions.

## Installation

```sh
yarn add react-native-photo-editor-pro
```

### Peer Dependencies

Ensure you have Skia installed in your project:

```sh
npx expo install @shopify/react-native-skia
```

## Usage

```tsx
import { PhotoEditor } from 'react-native-photo-editor-pro';

const App = () => {
  return (
    <PhotoEditor
      uri="https://example.com/photo.jpg"
      onSave={(editedUri) => {
        console.log('Saved image:', editedUri);
      }}
      onCancel={() => {
        console.log('Cancelled');
      }}
    />
  );
};

## Development

To work on the library and see changes in real-time within the `example` app:

1. In the root directory, start the watch mode:
   ```sh
   yarn watch
   ```
2. In the `example` directory, start the Expo app:
   ```sh
   cd example
   npx expo start
   ```

## Documentation

- **[Architecture Guide](docs/architecture/01-rendering-pipeline.md)**: Deep dive into the rendering engine and gesture logic.
- **[AI Agent Guidance](docs/AGENT_SKILLS.md)**: Standards and best practices for AI contributors.
- **[Contributing](CONTRIBUTING.md)**: How to set up the environment and submit PRs.

## License

MIT
