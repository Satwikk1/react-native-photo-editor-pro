# Contributing to react-native-photo-editor-pro

Thank you for your interest in contributing to this project!

## Development Workflow

This repository uses a monorepo-like structure with the library source in `src/` and a sample application in `example/`.

### 1. Setup

Clone the repository and install dependencies in the root using **yarn**:

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
yarn start
```

### 3. Professional Standards & Best Practices

We maintain a high bar for code quality. Please adhere to the following:

- **Strictly use yarn**: Never commit a `package-lock.json`.
- **Performance First**: All rendering logic MUST be optimized for Skia and Reanimated. No `setState` for animations.
- **Type Safety**: No `any` types. Everything must be strictly typed.
- **AI-Ready**: If you use an AI agent to help you code, ensure it has read `PROJECT_CONTEXT.md` and the guides in `docs/architecture/`.

## Submitting Changes

1. Create a new branch: `feat/` or `fix/`.
2. Ensure your changes are tested in the `example` app.
3. Update the documentation if you added a new feature.
4. Submit a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
