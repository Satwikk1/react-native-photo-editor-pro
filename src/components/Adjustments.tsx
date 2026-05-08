import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Canvas, ColorMatrix, Group, Image, RuntimeShader, Path } from "@shopify/react-native-skia";

import type { EditorStateManager } from "../state/EditorStateManager";
import { RulerDial } from "./RulerDial";
import { ToolButton } from "./ToolButton";
import { analyzeImage } from "./adjustments/autoEnhance";
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
  theme?: { primary?: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Adjustments = ({ stateManager, theme }: AdjustmentsProps) => {
  const primaryColor = theme?.primary ?? "#FFD60A";
  const [activeToolId, setActiveToolId] = useState<AdjustTool>(AdjustTool.EXPOSURE);
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);

  // Track whether we have run an analysis for this image so we only re-analyse
  // on explicit user request, not every time they switch back to the AUTO tool.
  const hasAnalysedRef = useRef(false);

  const {
    canvasLayout,
    onCanvasLayout,
    colorMatrix,
    shaderUniforms,
    filterColorFilter,
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

  // ─── Auto-enhance ─────────────────────────────────────────────────────────

  const runAutoAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    const targets = await analyzeImage(image);
    if (targets) {
      stateManager.applyAutoTargets(targets, 50);
      hasAnalysedRef.current = true;
    }
    setIsAnalyzing(false);
  }, [image, stateManager]);

  // Auto-trigger analysis the first time the user opens the AUTO tool.
  useEffect(() => {
    if (activeToolId === AdjustTool.AUTO && !hasAnalysedRef.current) {
      runAutoAnalysis();
    }
  }, [activeToolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Generic handlers ─────────────────────────────────────────────────────

  const handleToolChange = useCallback((val: number) => {
    const config = TOOL_STATE_CONFIG[activeToolId];
    const sm     = stateManager as any;
    sm[config.rawKey].value  = Math.round(val);
    sm[config.procKey].value = config.normalize(val);
  }, [activeToolId, stateManager]);

  const getRawValue = useCallback((id: AdjustTool) => {
    const sm = stateManager as any;
    return sm[TOOL_STATE_CONFIG[id].rawKey];
  }, [stateManager]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderDial = () => (
    <RulerDial
      key={activeToolId}
      value={getRawValue(activeToolId).value}
      min={activeTool.range[0]}
      max={activeTool.range[1]}
      onChange={handleToolChange}
      activeColor={primaryColor}
    />
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer} onLayout={onCanvasLayout}>
        <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }} pointerEvents="none">
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
              colorFilter={filterColorFilter}
            >
              <RuntimeShader source={masterShaderEffect} uniforms={shaderUniforms} />
              
              {/* Markup Layer — Render normalized vector paths */}
              <Group 
                transform={[
                  { scaleX: drawWidth }, 
                  { scaleY: drawHeight }
                ]}
              >
                {stateManager.paths.value.map((p, idx) => (
                  <Path
                    key={idx}
                    path={p.path}
                    style="stroke"
                    strokeWidth={p.width / drawWidth}
                    color={p.color}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                ))}
              </Group>
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
                  primaryColor={primaryColor}
                />
              </View>
            )}
          />
        </View>

        <View style={styles.dialWrapper}>
          <View style={styles.toolNameRow}>
            <Text style={styles.toolNameText}>
              {activeToolId === AdjustTool.AUTO ? "AUTO INTENSITY" : activeTool.name}
            </Text>
            {activeToolId === AdjustTool.AUTO && (
              <View style={styles.reAnalyseSlot}>
                {isAnalyzing
                  ? <ActivityIndicator color={primaryColor} size="small" />
                  : <Pressable onPress={runAutoAnalysis} style={[styles.reAnalyseButton, { borderColor: primaryColor, backgroundColor: `${primaryColor}14` }]}>
                      <Text style={[styles.reAnalyseText, { color: primaryColor }]}>Re-analyse</Text>
                    </Pressable>
                }
              </View>
            )}
          </View>
          {renderDial()}
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
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  toolNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
    gap: 8,
  },
  toolNameText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reAnalyseSlot: {
    width: 90,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  reAnalyseButton: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFCC00",
    backgroundColor: "rgba(255,204,0,0.08)",
  },
  reAnalyseText: {
    color: "#FFCC00",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
