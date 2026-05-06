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
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { EditorStateManager } from "../state/EditorStateManager";
import { RulerDial } from "./RulerDial";
import { ToolButton } from "./ToolButton";
import { IconName } from "./SkiaIcon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    // Rec. 709 Luminance
    const lr = 0.2126;
    const lg = 0.7152;
    const lb = 0.0722;

    // Temperature & Tint
    const rG = 1 + warmth.value;
    const bG = 1 - warmth.value;
    const gG = 1 + tint.value;

    const pivot = 0.5;
    const c = contrast.value;
    const b = brightness.value;
    const s = saturation.value;
    const e = exposure.value;
    const v = vibrance.value; // Simple implementation: blend saturation
    const bp = blackPoint.value;

    // Apply Black Point as an additional shadow offset
    const offset = (1 - c) * pivot + (b - 1) + (e - 1) - (bp * 0.5);

    const rW = c * rG;
    const gW = c * gG;
    const bW = c * bG;

    // Combine saturation and vibrance for simplicity in matrix
    const totalS = s * v;

    return [
      rW * ((1 - totalS) * lr + totalS), rW * ((1 - totalS) * lg),     rW * ((1 - totalS) * lb),     0, offset,
      gW * ((1 - totalS) * lr),     gW * ((1 - totalS) * lg + totalS),  gW * ((1 - totalS) * lb),     0, offset,
      bW * ((1 - totalS) * lr),     bW * ((1 - totalS) * lg),     bW * ((1 - totalS) * lb + totalS),  0, offset,
      0,                      0,                      0,                      1, 0,
    ];
  });

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
        stateManager.warmth.value = val / 200;
        break;
      case AdjustTool.TINT:
        stateManager.tintRaw.value = rounded;
        stateManager.tint.value = val / 200;
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
              <ColorMatrix matrix={matrix} />
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
