# AI Agent Skills & Guidance

This document is the primary reference for AI agents (and human contributors) to ensure contributions meet the "Pro" standard of this library.

## 1. Skill: High-Performance Skia Rendering
- **Context**: Every frame counts. We target 120 FPS.
- **Guidance**:
    - Use `useDerivedValue` for all dynamic Skia props.
    - Avoid `useMemo` for Skia values; use `useSharedValue` instead.
    - Implement complex filters as SkSL shaders (`Skia.RuntimeEffect`).
    - Use `BackdropBlur` sparingly; it's expensive on Android.

## 2. Skill: Advanced Gesture Interaction
- **Context**: Replicating the Apple "weighted" feel.
- **Guidance**:
    - Use `PanGesture` with `withDecay` for dials.
    - Implement "Rubber Banding" logic for crop boundaries.
    - Use `SelectionHaptic` for granular feedback.
    - Always handle gesture cancellation (`onFinalize`) to reset state.

## 3. Skill: Clean & Typed Codebase
- **Context**: Open source longevity depends on maintainability and flexibility.
- **Guidance**:
    - **Architecture**: Support both custom hooks and class objects. Ask the developer which to use for each new logic block.
    - **Typing**: No `any`. Use generics for flexible components.
    - Document every public prop in TypeScript interfaces.
    - Maintain the monorepo structure: code in `src/`, examples in `example/`.
    - **Package Manager**: Use ONLY `yarn`. Never suggest `npm`.

## 4. Skill: Professional UI/UX
- **Context**: First impressions matter.
- **Guidance**:
    - Use HSL-based color palettes for smooth gradients.
    - Use glassmorphism (blurs + subtle borders) for toolbars.
    - Transitions between editor modes should be animated (e.g., `withTiming` or `LayoutAnimation`).

## Mandatory Process
Before starting any task, the agent MUST:
1. Read `PROJECT_CONTEXT.md`.
2. **Consult the developer**: Present a brief plan and ask for architectural preference (e.g., "Hook vs. Class").
3. Check `docs/architecture/` for existing patterns.
4. Verify that the proposed solution follows the performance principles in `docs/architecture/01-rendering-pipeline.md`.
