import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  FlatList,
  Text,
} from "react-native";
import {
  Canvas,
  Image,
  ColorMatrix,
  Group,
  RuntimeShader,
  Skia,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { EditorStateManager } from "../state/EditorStateManager";
import { RulerDial } from "./RulerDial";
import { ToolButton } from "./ToolButton";
import { IconName } from "./SkiaIcon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Highlights, Shadows, and Vibrance require per-pixel luminance/saturation checks
// which are impossible in a linear ColorMatrix — they need a SkSL shader instead.
const NON_LINEAR_SKSL = `
  uniform shader image;
  uniform float vibrance;
  uniform float shadows;
  uniform float highlights;

  vec4 main(vec2 coord) {
    vec4 c = image.eval(coord);
    float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));

    float hMask = smoothstep(0.5, 1.0, luma);
    c.rgb = c.rgb * (1.0 + highlights * hMask);

    float sMask = 1.0 - smoothstep(0.0, 0.5, luma);
    c.rgb = c.rgb * (1.0 + shadows * sMask);

    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float sat = maxC - minC;
    float luma2 = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    c.rgb = mix(vec3(luma2), c.rgb, 1.0 + vibrance * (1.0 - sat));

    c.rgb = clamp(c.rgb, 0.0, 1.0);
    return c;
  }
`;

const nonLinearEffect = Skia.RuntimeEffect.Make(NON_LINEAR_SKSL)!;

enum AdjustTool {
  EXPOSURE = "EXPOSURE",
  BRILLIANCE = "BRILLIANCE",
  HIGHLIGHTS = "HIGHLIGHTS",
  SHADOWS = "SHADOWS",
  CONTRAST = "CONTRAST",
  BRIGHTNESS = "BRIGHTNESS",
  BLACK_POINT = "BLACK_POINT",
  SATURATION = "SATURATION",
  VIBRANCE = "VIBRANCE",
  WARMTH = "WARMTH",
  TINT = "TINT",
  SHARPNESS = "SHARPNESS",
  DEFINITION = "DEFINITION",
  NOISE_REDUCTION = "NOISE_REDUCTION",
  VIGNETTE = "VIGNETTE",
}

const ADJUST_TOOLS = [
  { id: AdjustTool.EXPOSURE, name: "EXPOSURE", icon: "EXPOSURE" as IconName, range: [-100, 100] },
  { id: AdjustTool.BRILLIANCE, name: "BRILLIANCE", icon: "BRILLIANCE" as IconName, range: [-100, 100] },
  { id: AdjustTool.HIGHLIGHTS, name: "HIGHLIGHTS", icon: "HIGHLIGHTS" as IconName, range: [-100, 100] },
  { id: AdjustTool.SHADOWS, name: "SHADOWS", icon: "SHADOWS" as IconName, range: [-100, 100] },
  { id: AdjustTool.CONTRAST, name: "CONTRAST", icon: "CONTRAST" as IconName, range: [-100, 100] },
  { id: AdjustTool.BRIGHTNESS, name: "BRIGHTNESS", icon: "BRIGHTNESS" as IconName, range: [-100, 100] },
  { id: AdjustTool.BLACK_POINT, name: "BLACK POINT", icon: "BLACK_POINT" as IconName, range: [-100, 100] },
  { id: AdjustTool.SATURATION, name: "SATURATION", icon: "SATURATION" as IconName, range: [-100, 100] },
  { id: AdjustTool.VIBRANCE, name: "VIBRANCE", icon: "VIBRANCE" as IconName, range: [-100, 100] },
  { id: AdjustTool.WARMTH, name: "WARMTH", icon: "WARMTH" as IconName, range: [-100, 100] },
  { id: AdjustTool.TINT, name: "TINT", icon: "TINT" as IconName, range: [-100, 100] },
  { id: AdjustTool.SHARPNESS, name: "SHARPNESS", icon: "SHARPNESS" as IconName, range: [0, 100] },
  { id: AdjustTool.DEFINITION, name: "DEFINITION", icon: "DEFINITION" as IconName, range: [0, 100] },
  { id: AdjustTool.NOISE_REDUCTION, name: "NOISE REDUCTION", icon: "NOISE_REDUCTION" as IconName, range: [0, 100] },
  { id: AdjustTool.VIGNETTE, name: "VIGNETTE", icon: "VIGNETTE" as IconName, range: [-100, 100] },
];

interface AdjustmentsProps {
  stateManager: EditorStateManager;
}

export const Adjustments = ({ stateManager }: AdjustmentsProps) => {
  const [activeToolId, setActiveToolId] = useState<AdjustTool>(AdjustTool.EXPOSURE);
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 });

  const {
    originalImage: image,
    exposure, brilliance, highlights, shadows, 
    contrast, brightness, blackPoint, saturation, 
    vibrance, warmth, tint, 
    sharpness, definition, noiseReduction, vignette,
    rotation,
    flipX,
  } = stateManager;

  const activeTool = useMemo(() => ADJUST_TOOLS.find(t => t.id === activeToolId)!, [activeToolId]);

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasLayout({ width, height });
  };

  if (!image) return null;

  const matrix = useDerivedValue(() => {
    // Rec. 709 luminance weights
    const R_LUM = 0.2126;
    const G_LUM = 0.7152;
    const B_LUM = 0.0722;

    // Exposure: multiplicative (stored as 1+val/100, so subtract 1 → power of 2)
    const exp = Math.pow(2, exposure.value - 1);

    const c   = contrast.value;        // 1.0 = neutral
    const b   = brightness.value - 1;  // 0.0 = neutral
    const s   = saturation.value;      // 1.0 = neutral
    const w   = warmth.value;          // 0.0 = neutral
    const tnt = tint.value;            // 0.0 = neutral
    const bp  = blackPoint.value;      // 0.0 = neutral
    const pivot = 0.5;

    // Saturation mix coefficients
    const t  = 1.0 - s;
    const rS = t * R_LUM;
    const gS = t * G_LUM;
    const bS = t * B_LUM;

    // Per-channel gain combines exposure, contrast, and white balance
    const rG = exp * c * (1 + w);
    const gG = exp * c * (1 + tnt);
    const bG = exp * c * (1 - w);

    // Offset implements the contrast pivot and brightness shift
    const off = (1 - c) * pivot + b - bp * 0.5;

    return [
      rG * (rS + s), rG * gS,       rG * bS,       0, off,
      gG * rS,       gG * (gS + s), gG * bS,       0, off,
      bG * rS,       bG * gS,       bG * (bS + s), 0, off,
      0,             0,             0,             1, 0,
    ];
  });

  // Uniforms for the RuntimeShader that handles non-linear effects
  const nonLinearUniforms = useDerivedValue(() => ({
    vibrance:   vibrance.value - 1.0,  // stored as 1+val/100 → normalize to -1…1
    shadows:    shadows.value,          // stored as val/100 → -1…1
    highlights: highlights.value,       // stored as val/100 → -1…1
  }));

  const transform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
    { scaleX: flipX.value },
  ]);

  const drawWidth = canvasLayout.width;
  const drawHeight = canvasLayout.width * (image.height() / image.width());
  const xOffset = 0;
  const yOffset = (canvasLayout.height - drawHeight) / 2;

  const handleToolChange = (val: number) => {
    const rounded = Math.round(val);
    switch (activeToolId) {
      case AdjustTool.EXPOSURE:
        stateManager.exposureRaw.value = rounded;
        stateManager.exposure.value = 1 + val / 100;
        break;
      case AdjustTool.BRILLIANCE:
        stateManager.brillianceRaw.value = rounded;
        stateManager.brilliance.value = val / 100;
        break;
      case AdjustTool.HIGHLIGHTS:
        stateManager.highlightsRaw.value = rounded;
        stateManager.highlights.value = val / 100;
        break;
      case AdjustTool.SHADOWS:
        stateManager.shadowsRaw.value = rounded;
        stateManager.shadows.value = val / 100;
        break;
      case AdjustTool.CONTRAST:
        stateManager.contrastRaw.value = rounded;
        stateManager.contrast.value = 1 + val / 100;
        break;
      case AdjustTool.BRIGHTNESS:
        stateManager.brightnessRaw.value = rounded;
        stateManager.brightness.value = 1 + val / 100;
        break;
      case AdjustTool.BLACK_POINT:
        stateManager.blackPointRaw.value = rounded;
        stateManager.blackPoint.value = val / 100;
        break;
      case AdjustTool.SATURATION:
        stateManager.saturationRaw.value = rounded;
        stateManager.saturation.value = 1 + val / 100;
        break;
      case AdjustTool.VIBRANCE:
        stateManager.vibranceRaw.value = rounded;
        stateManager.vibrance.value = 1 + val / 100;
        break;
      case AdjustTool.WARMTH:
        stateManager.warmthRaw.value = rounded;
        stateManager.warmth.value = val / 500;
        break;
      case AdjustTool.TINT:
        stateManager.tintRaw.value = rounded;
        stateManager.tint.value = val / 500;
        break;
      case AdjustTool.SHARPNESS:
        stateManager.sharpnessRaw.value = rounded;
        stateManager.sharpness.value = val / 100;
        break;
      case AdjustTool.DEFINITION:
        stateManager.definitionRaw.value = rounded;
        stateManager.definition.value = val / 100;
        break;
      case AdjustTool.NOISE_REDUCTION:
        stateManager.noiseReductionRaw.value = rounded;
        stateManager.noiseReduction.value = val / 100;
        break;
      case AdjustTool.VIGNETTE:
        stateManager.vignetteRaw.value = rounded;
        stateManager.vignette.value = val / 100;
        break;
    }
  };

  const getActiveToolRawValue = () => {
    switch (activeToolId) {
      case AdjustTool.EXPOSURE: return stateManager.exposureRaw;
      case AdjustTool.BRILLIANCE: return stateManager.brillianceRaw;
      case AdjustTool.HIGHLIGHTS: return stateManager.highlightsRaw;
      case AdjustTool.SHADOWS: return stateManager.shadowsRaw;
      case AdjustTool.CONTRAST: return stateManager.contrastRaw;
      case AdjustTool.BRIGHTNESS: return stateManager.brightnessRaw;
      case AdjustTool.BLACK_POINT: return stateManager.blackPointRaw;
      case AdjustTool.SATURATION: return stateManager.saturationRaw;
      case AdjustTool.VIBRANCE: return stateManager.vibranceRaw;
      case AdjustTool.WARMTH: return stateManager.warmthRaw;
      case AdjustTool.TINT: return stateManager.tintRaw;
      case AdjustTool.SHARPNESS: return stateManager.sharpnessRaw;
      case AdjustTool.DEFINITION: return stateManager.definitionRaw;
      case AdjustTool.NOISE_REDUCTION: return stateManager.noiseReductionRaw;
      case AdjustTool.VIGNETTE: return stateManager.vignetteRaw;
    }
  };

  const getToolRawSharedValue = (id: AdjustTool) => {
    switch (id) {
      case AdjustTool.EXPOSURE: return stateManager.exposureRaw;
      case AdjustTool.BRILLIANCE: return stateManager.brillianceRaw;
      case AdjustTool.HIGHLIGHTS: return stateManager.highlightsRaw;
      case AdjustTool.SHADOWS: return stateManager.shadowsRaw;
      case AdjustTool.CONTRAST: return stateManager.contrastRaw;
      case AdjustTool.BRIGHTNESS: return stateManager.brightnessRaw;
      case AdjustTool.BLACK_POINT: return stateManager.blackPointRaw;
      case AdjustTool.SATURATION: return stateManager.saturationRaw;
      case AdjustTool.VIBRANCE: return stateManager.vibranceRaw;
      case AdjustTool.WARMTH: return stateManager.warmthRaw;
      case AdjustTool.TINT: return stateManager.tintRaw;
      case AdjustTool.SHARPNESS: return stateManager.sharpnessRaw;
      case AdjustTool.DEFINITION: return stateManager.definitionRaw;
      case AdjustTool.NOISE_REDUCTION: return stateManager.noiseReductionRaw;
      case AdjustTool.VIGNETTE: return stateManager.vignetteRaw;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer} onLayout={onLayout}>
        <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }}>
          <Group
            origin={{ x: xOffset + drawWidth / 2, y: yOffset + drawHeight / 2 }}
            transform={transform}
          >
            <Image
              image={image}
              x={xOffset}
              y={yOffset}
              width={drawWidth}
              height={drawHeight}
              fit="contain"
            >
              {/* Pass 1: linear math (exposure, contrast, brightness, saturation, warmth, tint) */}
              <ColorMatrix matrix={matrix} />
              {/* Pass 2: non-linear math that requires per-pixel luminance/saturation checks */}
              <RuntimeShader source={nonLinearEffect} uniforms={nonLinearUniforms} />
            </Image>
          </Group>
        </Canvas>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.toolsListWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={ADJUST_TOOLS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.toolsListContent}
            renderItem={({ item }) => (
              <View style={styles.toolItem}>
                <ToolButton
                  icon={item.icon}
                  isActive={activeToolId === item.id}
                  toolValue={getToolRawSharedValue(item.id)}
                  onPress={() => setActiveToolId(item.id)}
                  max={item.range[1]}
                />
              </View>
            )}
          />
        </View>

        <View style={styles.dialWrapper}>
          <Text style={styles.toolNameText}>{activeTool.name}</Text>
          <RulerDial
            key={activeToolId}
            value={getActiveToolRawValue().value}
            min={activeTool.range[0]}
            max={activeTool.range[1]}
            onChange={handleToolChange}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  controlsContainer: {
    paddingTop: 10,
    paddingBottom: 0,
    backgroundColor: "#000",
  },
  toolsListWrapper: {
    height: 60,
  },
  toolsListContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  toolItem: {
    marginHorizontal: 8,
  },
  dialWrapper: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  toolNameText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 8,
    textTransform: "uppercase",
  },
});
