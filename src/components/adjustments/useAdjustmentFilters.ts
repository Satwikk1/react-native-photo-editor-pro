import { useState } from "react";
import { Dimensions } from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import type { EditorStateManager } from "../../state/EditorStateManager";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Rec. 709 luminance weights — shared between the matrix worklet and the shader.
const R_LUM = 0.2126;
const G_LUM = 0.7152;
const B_LUM = 0.0722;

export function useAdjustmentFilters(stateManager: EditorStateManager) {
  const {
    exposure, contrast, brightness, saturation,
    warmth, tint, blackPoint,
    vibrance, shadows, highlights, brilliance,
    vignette, sharpness, definition, noiseReduction,
    rotation, flipX,
    autoIntensity,
    autoExposureTarget, autoContrastTarget,
    autoWarmthTarget,   autoSaturationTarget,
  } = stateManager;

  // ─── Canvas dimensions ───────────────────────────────────────────────────
  // Kept as SharedValues so the vignette uniform stays reactive across layout
  // changes without routing through React state → re-render → hook re-run.

  const canvasWidthSV  = useSharedValue(SCREEN_WIDTH);
  const canvasHeightSV = useSharedValue(SCREEN_HEIGHT * 0.7);
  const [canvasLayout, setCanvasLayout] = useState({
    width:  SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  });

  const onCanvasLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasLayout({ width, height });
    canvasWidthSV.value  = width;
    canvasHeightSV.value = height;
  };

  // ─── Pass 1: linear ColorMatrix ──────────────────────────────────────────
  // Handles: Exposure · Contrast · Brightness · Saturation · Warmth · Tint · Black Point.
  // Everything here maps cleanly to a 4×5 affine transform over RGB.

  const colorMatrix = useDerivedValue(() => {
    // Auto-enhance blend: V_final = V_manual + (V_target − V_neutral) × intensity.
    // Intensity=0 → pure manual values. Intensity=1 → full auto targets.
    // Only exposure, contrast, warmth, and saturation are analysed; the rest
    // come from manual sliders unchanged.
    const ai = autoIntensity.value;
    const exposureBlended   = exposure.value   + (autoExposureTarget.value   - 1.0) * ai;
    const contrastBlended   = contrast.value   + (autoContrastTarget.value   - 1.0) * ai;
    const saturationBlended = saturation.value + (autoSaturationTarget.value - 1.0) * ai;
    // warmth target is already in the val/500 scale (−0.2…0.2), neutral = 0.
    const warmthBlended     = warmth.value     + autoWarmthTarget.value             * ai;

    // Exposure: power-of-2 multiplier so +100 = 2× brightness, −100 = 0.5×.
    const exp = Math.pow(2, exposureBlended - 1);

    const c   = contrastBlended;       // 1.0 = neutral
    const b   = brightness.value - 1;  // 0.0 = neutral (not auto-adjusted)
    const s   = saturationBlended;     // 1.0 = neutral
    const w   = warmthBlended;         // 0.0 = neutral
    const tnt = tint.value;            // 0.0 = neutral (not auto-adjusted)
    const bp  = blackPoint.value;      // 0.0 = neutral (not auto-adjusted)

    // Saturation desaturation mix coefficients.
    const t  = 1.0 - s;
    const rS = t * R_LUM;
    const gS = t * G_LUM;
    const bS = t * B_LUM;

    // Per-channel gain: exposure × contrast × white-balance shift.
    const rG = exp * c * (1 + w);
    const gG = exp * c * (1 + tnt);
    const bG = exp * c * (1 - w);

    // Offset: contrast pivot + brightness lift + black-point clip.
    const off = (1 - c) * 0.5 + b - bp * 0.5;

    // Row-major 4×5 matrix (R, G, B, A rows; 5th column is the offset).
    return [
      rG * (rS + s), rG * gS,        rG * bS,        0, off,
      gG * rS,       gG * (gS + s),  gG * bS,        0, off,
      bG * rS,       bG * gS,        bG * (bS + s),  0, off,
      0,             0,              0,              1, 0,
    ];
  });

  // ─── Pass 2: master SkSL shader ──────────────────────────────────────────
  // Handles every effect that needs per-pixel luminance/saturation awareness
  // or spatial neighbours: Vibrance · Highlights · Shadows · Brilliance ·
  // Vignette · Sharpness · Definition · Noise Reduction.

  const shaderUniforms = useDerivedValue(() => ({
    vibrance:       vibrance.value - 1.0,  // stored as 1+v/100 → shader wants −1…1
    shadows:        shadows.value,          // v/100 → −1…1
    highlights:     highlights.value,       // v/100 → −1…1
    brilliance:     brilliance.value,       // v/100 → −1…1
    vignette:       vignette.value,         // v/100 → −1…1
    sharpness:      sharpness.value,        // v/100 →  0…1
    definition:     definition.value,       // v/100 →  0…1
    noiseReduction: noiseReduction.value,   // v/100 →  0…1
    canvasSize:     [canvasWidthSV.value, canvasHeightSV.value],
  }));

  // ─── Image transform ─────────────────────────────────────────────────────

  const imageTransform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
    { scaleX: flipX.value },
  ]);

  return {
    canvasLayout,
    onCanvasLayout,
    colorMatrix,
    shaderUniforms,
    imageTransform,
  };
}
