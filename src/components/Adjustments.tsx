import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, FlatList, Text } from "react-native";
import { Canvas, ColorMatrix, Group, Image, RuntimeShader } from "@shopify/react-native-skia";

import type { EditorStateManager } from "../state/EditorStateManager";
import { RulerDial } from "./RulerDial";
import { ToolButton } from "./ToolButton";
import {
  AdjustTool,
  ADJUST_TOOLS,
  TOOL_STATE_CONFIG,
  masterShaderEffect,
} from "./adjustments/constants";
import { useAdjustmentFilters } from "./adjustments/useAdjustmentFilters";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdjustmentsProps {
  stateManager: EditorStateManager;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Adjustments = ({ stateManager }: AdjustmentsProps) => {
  const [activeToolId, setActiveToolId] = useState<AdjustTool>(AdjustTool.EXPOSURE);

  const {
    canvasLayout,
    onCanvasLayout,
    colorMatrix,
    shaderUniforms,
    imageTransform,
  } = useAdjustmentFilters(stateManager);

  const activeTool = useMemo(
    () => ADJUST_TOOLS.find((t) => t.id === activeToolId)!,
    [activeToolId],
  );

  const { originalImage: image } = stateManager;
  if (!image) return null;

  // ─── Derived layout ───────────────────────────────────────────────────────

  const drawWidth  = canvasLayout.width;
  const drawHeight = canvasLayout.width * (image.height() / image.width());
  const xOffset    = 0;
  const yOffset    = (canvasLayout.height - drawHeight) / 2;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleToolChange = useCallback((val: number) => {
    const config  = TOOL_STATE_CONFIG[activeToolId];
    const sm      = stateManager as any;
    sm[config.rawKey].value  = Math.round(val);
    sm[config.procKey].value = config.normalize(val);
  }, [activeToolId, stateManager]);

  const getRawValue = useCallback((id: AdjustTool) => {
    const sm = stateManager as any;
    return sm[TOOL_STATE_CONFIG[id].rawKey];
  }, [stateManager]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer} onLayout={onCanvasLayout}>
        <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }}>
          <Group
            origin={{ x: xOffset + drawWidth / 2, y: yOffset + drawHeight / 2 }}
            transform={imageTransform}
          >
            <Image
              image={image}
              x={xOffset}
              y={yOffset}
              width={drawWidth}
              height={drawHeight}
              fit="contain"
            >
              {/* Pass 1 — linear: exposure, contrast, brightness, saturation, warmth, tint */}
              <ColorMatrix matrix={colorMatrix} />
              {/* Pass 2 — non-linear: brilliance, highlights, shadows, vibrance,
                          sharpness, definition, noise reduction, vignette       */}
              <RuntimeShader source={masterShaderEffect} uniforms={shaderUniforms} />
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
                  toolValue={getRawValue(item.id)}
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
            value={getRawValue(activeToolId).value}
            min={activeTool.range[0]}
            max={activeTool.range[1]}
            onChange={handleToolChange}
          />
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
