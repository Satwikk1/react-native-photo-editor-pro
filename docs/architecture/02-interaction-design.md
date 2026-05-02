# Interaction Design & Gesture Best Practices

This document defines how users interact with the photo editor and the best practices for implementing these interactions.

## 1. Gesture Management
We rely on `react-native-gesture-handler` for all interactions.

### Unified Gesture Model:
- **Cropping**: Uses a combination of `PanGesture` and `PinchGesture`. Panning moves the image within the crop frame; pinching scales it.
- **Adjustments (Dials)**: Uses a `PanGesture` that maps horizontal translation to a circular rotation value.
- **Markup**: Uses `PanGesture` to record path points into a `SkPath`.

## 2. Interaction Best Practices

### Animation Consistency:
- Use **Spring Animations** for natural-feeling snaps (e.g., when an image bounces back into the crop frame).
- Use **Decay Animations** for the adjustment dial to give it "weight".
- Default Spring Config: `{ damping: 20, stiffness: 150, mass: 1 }`.

### State Synchronization:
- All interaction state MUST be kept in **Reanimated Shared Values**.
- Use `useWorkletCallback` if logic needs to run on the UI thread without crossing the bridge.
- Synchronization with the JS thread (for saving or canceling) should happen via `runOnJS`.

### UI Feedback:
- **Haptics**: Trigger `SelectionHaptic` when a dial snaps to a value or a crop edge is reached.
- **Visual Cues**: Use subtle blurs and opacity changes to focus the user's attention (e.g., dimming the background during crop).

## 3. The "Apple-Native" Feel
- **Rubber Banding**: When zooming or panning past limits, implement a logarithmic resistance (rubber-banding) before snapping back.
- **Inertia**: The adjustment dial should have momentum. Use `withDecay` to simulate physical rotation.
- **Glassmorphism**: Use Skia `BackdropBlur` for toolbars and overlays to match the iOS aesthetic.
