# Contributing to react-native-photo-editor-pro

Thank you for your interest in contributing to this project!

## Development Workflow

This repository uses a monorepo-like structure with the library source in `src/` and a sample application in `example/`.

### 1. Setup

Clone the repository and install dependencies in the root:

```bash
yarn install
```

### 2. Running the Example App

To test your changes, you should run the example app. Since the example app consumes the built code from `lib/`, you need to keep the build synchronized.

**In the root directory:**
```bash
yarn watch
```
This will watch your `src/` files and rebuild them into `lib/` whenever they change.

**In a second terminal, go to the example app:**
```bash
cd example
yarn install
npx expo start
```

### 3. Code Style

- Use TypeScript for all new code.
- Ensure all React Native Skia code follows the performance best practices (using Shared Values and Reanimated).
- Keep components focused and modular.

## Submitting Changes

1. Create a new branch for your feature or bugfix.
2. Ensure your changes are tested in the `example` app.
3. Submit a Pull Request with a clear description of the changes.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
