# react-native-photo-editor-pro

A professional-grade, high-performance photo editor for React Native, powered by **React Native Skia** and **Reanimated**.

## Features

- 🎨 **Pro Filters**: Real-time brightness, contrast, and saturation adjustments using Skia shaders.
- ✂️ **Advanced Cropping**: Pan, zoom, and aspect ratio presets (1:1, 4:5, 16:9, etc.).
- ✍️ **Drawing Board**: Smooth freehand drawing with hardware-accelerated rendering.
- 🚀 **High-Res Export**: Capture your edits at full resolution using Skia's offscreen rendering.

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
