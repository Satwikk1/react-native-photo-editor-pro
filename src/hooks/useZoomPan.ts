import { useRef } from "react";
import { PanResponder, Dimensions } from "react-native";
import { useSharedValue, useDerivedValue, withSpring } from "react-native-reanimated";

export function useZoomPan(
  canvasLayout: { width: number; height: number },
  canvasOffsetRef: React.MutableRefObject<{ x: number; y: number }>
) {
  const zoomScale = useSharedValue(1.0);
  const zoomTranslateX = useSharedValue(0.0);
  const zoomTranslateY = useSharedValue(0.0);

  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1.0);
  const initialTouch = useRef<{ x: number; y: number } | null>(null);
  const initialMidpoint = useRef<{ x: number; y: number } | null>(null);
  const initialPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTap = useRef<number>(0);

  // Helper to get absolute touch coordinates relative to the canvas container.
  const getCanvasCoords = (touch: { pageX: number; pageY: number }) => {
    const offset = canvasOffsetRef.current;
    return {
      x: touch.pageX - offset.x,
      y: touch.pageY - offset.y,
    };
  };

  const getDistance = (touches: any[]) => {
    const [t1, t2] = touches;
    return Math.sqrt(
      Math.pow(t1.pageX - t2.pageX, 2) + Math.pow(t1.pageY - t2.pageY, 2)
    );
  };

  const getMidpoint = (touches: any[]) => {
    const c1 = getCanvasCoords(touches[0]);
    const c2 = getCanvasCoords(touches[1]);
    return {
      x: (c1.x + c2.x) / 2,
      y: (c1.y + c2.y) / 2,
    };
  };

  const resetZoom = () => {
    zoomScale.value = withSpring(1.0);
    zoomTranslateX.value = withSpring(0.0);
    zoomTranslateY.value = withSpring(0.0);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        const now = Date.now();

        // Double-tap to toggle zoom between 1.0x and 2.5x
        if (touches.length === 1 && now - lastTap.current < 300) {
          if (zoomScale.value > 1.1) {
            resetZoom();
          } else {
            const coords = getCanvasCoords(evt.nativeEvent);
            const width = canvasLayout.width || Dimensions.get("window").width;
            const height = canvasLayout.height || Dimensions.get("window").height * 0.7;

            const targetScale = 2.5;
            const targetTx = (1 - targetScale) * coords.x;
            const targetTy = (1 - targetScale) * coords.y;

            const minTx = (1 - targetScale) * width;
            const minTy = (1 - targetScale) * height;

            zoomScale.value = withSpring(targetScale);
            zoomTranslateX.value = withSpring(Math.max(minTx, Math.min(0, targetTx)));
            zoomTranslateY.value = withSpring(Math.max(minTy, Math.min(0, targetTy)));
          }
          lastTap.current = 0;
          return;
        }

        if (touches.length === 1) {
          lastTap.current = now;
        }

        if (touches.length === 2) {
          initialDistance.current = getDistance(touches);
          initialScale.current = zoomScale.value;
          initialMidpoint.current = getMidpoint(touches);
          initialPan.current = { x: zoomTranslateX.value, y: zoomTranslateY.value };
        } else if (touches.length === 1) {
          initialTouch.current = getCanvasCoords(touches[0]);
          initialPan.current = { x: zoomTranslateX.value, y: zoomTranslateY.value };
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        const width = canvasLayout.width || Dimensions.get("window").width;
        const height = canvasLayout.height || Dimensions.get("window").height * 0.7;

        if (touches.length === 2) {
          // Detect transition from 1 touch to 2 touches (finger added mid-gesture)
          if (initialDistance.current === null || initialMidpoint.current === null) {
            initialDistance.current = getDistance(touches);
            initialScale.current = zoomScale.value;
            initialMidpoint.current = getMidpoint(touches);
            initialPan.current = { x: zoomTranslateX.value, y: zoomTranslateY.value };
            return;
          }

          // 1. Pinch Zoom
          const currentDistance = getDistance(touches);
          const nextScale = initialScale.current * (currentDistance / initialDistance.current);
          const clampedScale = Math.max(1.0, Math.min(5.0, nextScale));
          zoomScale.value = clampedScale;

          // 2. Pivot Zoom Math
          const ds = clampedScale / initialScale.current;
          const currentMidpoint = getMidpoint(touches);
          const dx = currentMidpoint.x - initialMidpoint.current.x;
          const dy = currentMidpoint.y - initialMidpoint.current.y;

          const nextTx = ds * initialPan.current.x + (1 - ds) * initialMidpoint.current.x + dx;
          const nextTy = ds * initialPan.current.y + (1 - ds) * initialMidpoint.current.y + dy;

          const minTx = (1 - clampedScale) * width;
          const minTy = (1 - clampedScale) * height;

          zoomTranslateX.value = Math.max(minTx, Math.min(0, nextTx));
          zoomTranslateY.value = Math.max(minTy, Math.min(0, nextTy));
        } else if (touches.length === 1) {
          // Detect transition from 2 touches to 1 touch (finger lifted mid-gesture)
          if (initialDistance.current !== null) {
            initialDistance.current = null;
            initialMidpoint.current = null;
            initialTouch.current = getCanvasCoords(touches[0]);
            initialPan.current = { x: zoomTranslateX.value, y: zoomTranslateY.value };
            return;
          }

          if (initialTouch.current !== null) {
            // Single-finger Pan (only if zoomed in)
            if (zoomScale.value > 1.05) {
              const currentTouch = getCanvasCoords(touches[0]);
              const dx = currentTouch.x - initialTouch.current.x;
              const dy = currentTouch.y - initialTouch.current.y;

              const nextTx = initialPan.current.x + dx;
              const nextTy = initialPan.current.y + dy;

              const clampedScale = zoomScale.value;
              const minTx = (1 - clampedScale) * width;
              const minTy = (1 - clampedScale) * height;

              zoomTranslateX.value = Math.max(minTx, Math.min(0, nextTx));
              zoomTranslateY.value = Math.max(minTy, Math.min(0, nextTy));
            }
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = null;
        initialTouch.current = null;
        initialMidpoint.current = null;

        // If zoom is returned to baseline size, smoothly snap offset back to center
        if (zoomScale.value <= 1.05) {
          zoomScale.value = withSpring(1.0);
          zoomTranslateX.value = withSpring(0.0);
          zoomTranslateY.value = withSpring(0.0);
        }
      },
      onPanResponderTerminate: () => {
        initialDistance.current = null;
        initialTouch.current = null;
        initialMidpoint.current = null;
      },
    })
  ).current;

  // Applying translation first, then scale.
  // In Skia's right-to-left evaluation, this means scale is applied first to the geometry,
  // and translation is applied last. This maps translateX and translateY directly to screen/canvas pixels.
  const zoomTransform = useDerivedValue(() => [
    { translateX: zoomTranslateX.value },
    { translateY: zoomTranslateY.value },
    { scale: zoomScale.value },
  ]);

  return {
    panHandlers: panResponder.panHandlers,
    zoomTransform,
    resetZoom,
  };
}
