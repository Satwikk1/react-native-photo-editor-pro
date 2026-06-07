import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Canvas, ColorMatrix, Group, Image, RuntimeShader, Path, Rect, Skia } from "@shopify/react-native-skia";

import type { EditorStateManager } from "../state/EditorStateManager";
import { FilterThumbnail } from "./FilterThumbnail";
import { RulerDial } from "./RulerDial";
import { VibrationType, HapticTickType } from "../utils/vibration";
import { addAlpha } from "../utils/convert";
import type { EditorTheme } from "../theme/types";
import { useZoomPan } from "../hooks/useZoomPan";
import {
  blendMatrix,
  IDENTITY_MATRIX,
  PRO_FILTERS,
  type FilterCategory,
  type FilterConfig,
} from "./filters/registry";

// ─── Constants ────────────────────────────────────────────────────────────────

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ORIGINAL_FILTER = PRO_FILTERS[0];
const DIAL_MAX_H = 80;
const TIMING_CFG = { duration: 260, easing: Easing.out(Easing.cubic) };

// Height of everything in the controls overlay that doesn't animate:
// paddingTop(6) + categoryRow(~44) + thumbnailStrip(104) = 154
const STATIC_CTRL_H = 154;

const CATEGORIES: { key: FilterCategory | "all"; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "analog",    label: "Analog"    },
  { key: "cinematic", label: "Cinematic" },
  { key: "bw",        label: "B&W"       },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface FiltersProps {
  stateManager: EditorStateManager;
  theme?: EditorTheme;
  showOriginal?: boolean;
  customFilters?: FilterConfig[];
  replaceDefaultFilters?: boolean;
  enableVibration?: boolean;
  vibrationType?: VibrationType;
  onTriggerHaptic?: (type: HapticTickType) => void;
}

export const Filters = ({
  stateManager,
  theme,
  showOriginal = false,
  customFilters,
  replaceDefaultFilters = false,
  enableVibration = true,
  vibrationType = VibrationType.DEFAULT,
  onTriggerHaptic,
}: FiltersProps) => {
  const primaryColor = theme?.primary ?? "#FFD60A";
  const textColor = theme?.text ?? "#FFF";
  const editorBg = theme?.background ?? "#000";
  const sliderActiveColor = theme?.sliderActive ?? primaryColor;

  const { rotation, flipX, originalImage: image } = stateManager;

  const thumbImage = useMemo(() => {
    if (!image) return null;
    const tw = 120;
    const th = Math.round(tw * (image.height() / image.width()));
    const surface = Skia.Surface.Make(tw, th);
    if (!surface) return image;
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    canvas.drawImageRect(
      image,
      { x: 0, y: 0, width: image.width(), height: image.height() },
      { x: 0, y: 0, width: tw, height: th },
      paint
    );
    return surface.makeImageSnapshot();
  }, [image]);

  // Custom filter merging
  const allFilters = useMemo(() => {
    if (replaceDefaultFilters) {
      const orig = PRO_FILTERS.find((f) => f.id === "original") || ORIGINAL_FILTER;
      const filteredCustom = (customFilters || []).filter((f) => f.id !== "original");
      return [orig, ...filteredCustom];
    }
    return [...PRO_FILTERS, ...(customFilters || [])];
  }, [customFilters, replaceDefaultFilters]);

  // React state: only used for canvas style dimensions (fires on layout, not during animation)
  const [canvasLayout,   setCanvasLayout]   = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [activeFilter, setActiveFilter] = useState<FilterConfig>(() => {
    const id = stateManager.filterId.value;
    return allFilters.find(f => f.id === id) ?? ORIGINAL_FILTER;
  });
  const [activeCategory, setActiveCategory] = useState<FilterCategory | "all">("all");

  const containerRef = useRef<View>(null);
  const canvasOffsetRef = useRef({ x: 0, y: 0 });

  const { panHandlers, zoomTransform } = useZoomPan(canvasLayout, canvasOffsetRef);

  // SharedValues — updated on the UI thread, never trigger React re-renders
  const intensitySV    = useSharedValue(stateManager.filterIntensity.value);
  const activeMatrixSV = useSharedValue<number[]>(activeFilter.matrix ?? IDENTITY_MATRIX);
  const dialHeightSV   = useSharedValue(activeFilter.id === "original" ? 0 : DIAL_MAX_H);
  const canvasHeightSV = useSharedValue(SCREEN_WIDTH); // kept in sync with canvasLayout.height

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleFilterSelect = useCallback((filter: FilterConfig) => {
    setActiveFilter(filter);
    intensitySV.value    = 100;
    activeMatrixSV.value = filter.matrix ?? IDENTITY_MATRIX;
    dialHeightSV.value   = withTiming(filter.id === "original" ? 0 : DIAL_MAX_H, TIMING_CFG);

    // Sync with StateManager
    stateManager.setFilter(filter.id, filter.matrix ?? null, filter.effect ?? null, 100);
  }, [intensitySV, activeMatrixSV, dialHeightSV, stateManager]);

  const handleIntensityChange = useCallback((val: number) => {
    "worklet";
    intensitySV.value = val;
    stateManager.setFilterIntensity(val);
  }, [intensitySV, stateManager]);

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasLayout({ width, height });
    canvasHeightSV.value = height;
    containerRef.current?.measure((x, y, w, h, px, py) => {
      canvasOffsetRef.current = { x: px, y: py };
    });
  };

  // ─── Derived values ─────────────────────────────────────────────────────

  const blendedMatrix = useDerivedValue(() =>
    blendMatrix(activeMatrixSV.value, intensitySV.value / 100),
  );

  const shaderUniforms = useDerivedValue(() => ({
    intensity: intensitySV.value / 100,
  }));

  // The image draw height is constant (fixed aspect ratio).
  const drawWidth  = canvasLayout.width;
  const drawHeight = canvasLayout.width * (image.height() / image.width());

  // Outer Group: slides the image up/down as the dial animates in/out.
  // Runs entirely on the UI thread — the canvas never resizes.
  const positionTransform = useDerivedValue(() => {
    const visibleH = canvasHeightSV.value - STATIC_CTRL_H - dialHeightSV.value;
    const yOff = (visibleH - drawHeight) / 2;
    return [{ translateY: yOff }];
  });

  // Inner Group: rotation + flip around the image's own center.
  const orientationTransform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
    { scaleX: flipX.value },
  ]);

  // Dial area: height + opacity animate together.
  const dialAnimStyle = useAnimatedStyle(() => ({
    height:   dialHeightSV.value,
    opacity:  dialHeightSV.value / DIAL_MAX_H,
    overflow: "hidden" as const,
  }));

  // Intensity number label: runs on UI thread, no setState while dragging.
  const intensityLabelProps = useAnimatedProps(() => {
    const v = Math.round(intensitySV.value);
    return { text: `INTENSITY  ${v}`, defaultValue: `INTENSITY  ${v}` };
  });

  // ─── Filtered list ──────────────────────────────────────────────────────

  const visibleFilters = activeCategory === "all"
    ? allFilters
    : allFilters.filter(f => f.category === activeCategory || f.id === "original");

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: editorBg }]}>

      {/* Canvas — fills full container, never resizes */}
      <View 
        ref={containerRef}
        style={[styles.canvasContainer, { backgroundColor: editorBg }]} 
        onLayout={onCanvasLayout}
        {...panHandlers}
      >
        <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }} pointerEvents="none">
          <Rect x={0} y={0} width={canvasLayout.width} height={canvasLayout.height} color={editorBg} />
          
          <Group
            transform={zoomTransform}
          >
            {/* Outer: reactive Y position so image stays above the controls overlay */}
            <Group transform={positionTransform}>
              {/* Inner: rotation + flip pivot around the image centre */}
              <Group
                origin={{ x: drawWidth / 2, y: drawHeight / 2 }}
                transform={orientationTransform}
              >
                <Image
                  image={image}
                  x={0}
                  y={0}
                  width={drawWidth}
                  height={drawHeight}
                  fit="contain"
                >
                  {!showOriginal && (
                    activeFilter.effect
                      ? <RuntimeShader source={activeFilter.effect} uniforms={shaderUniforms} />
                      : <ColorMatrix matrix={blendedMatrix} />
                  )}
                  
                  {/* Markup Layer — Render normalized vector paths */}
                  <Group 
                    transform={[
                      { scaleX: drawWidth }, 
                      { scaleY: drawHeight }
                    ]}
                  >
                    {!showOriginal && stateManager.paths.value.map((p, idx) => (
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
            </Group>
          </Group>
        </Canvas>
      </View>

      {/* Controls — absolute overlay, never pushes the canvas */}
      <View style={[styles.controls, { backgroundColor: editorBg }]}>
        <View style={styles.categoryRow}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.categoryPill,
                activeCategory === cat.key && { borderColor: primaryColor, backgroundColor: `${primaryColor}14` },
              ]}
            >
              <Text style={[
                styles.categoryLabel,
                activeCategory === cat.key ? { color: primaryColor } : { color: addAlpha(textColor, "80") },
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          horizontal
          data={visibleFilters}
          keyExtractor={f => f.id}
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailStrip}
          contentContainerStyle={styles.thumbnailList}
          renderItem={({ item }) => (
            <View style={styles.thumbnailItem}>
              <FilterThumbnail
                image={thumbImage ?? image}
                filter={item}
                isActive={activeFilter.id === item.id}
                onPress={() => handleFilterSelect(item)}
                primaryColor={primaryColor}
              />
              <Text style={[
                styles.filterName,
                activeFilter.id === item.id ? { color: primaryColor } : { color: addAlpha(textColor, "B3") },
              ]}>
                {item.name}
              </Text>
            </View>
          )}
        />

        <Animated.View style={[styles.dialArea, dialAnimStyle]}>
          <AnimatedTextInput
            animatedProps={intensityLabelProps}
            editable={false}
            style={[styles.intensityLabel, { color: textColor }]}
          />
          <RulerDial
            value={100}
            min={0}
            max={100}
            onChange={handleIntensityChange}
            activeColor={sliderActiveColor}
            theme={theme}
            enableVibration={enableVibration}
            vibrationType={vibrationType}
            onTriggerHaptic={onTriggerHaptic}
          />
        </Animated.View>
      </View>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: "#000",
  },
  canvasContainer: {
    flex:            1,
    backgroundColor: "#000",
  },
  controls: {
    position:        "absolute",
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: "#000",
    paddingTop:      6,
  },

  categoryRow: {
    flexDirection:     "row",
    justifyContent:    "center",
    gap:               8,
    paddingVertical:   6,
    paddingHorizontal: 16,
  },
  categoryPill: {
    paddingVertical:   4,
    paddingHorizontal: 14,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       "#2A2A2A",
  },
  categoryPillActive: {
    borderColor:     "#FFD60A",
    backgroundColor: "rgba(255,214,10,0.08)",
  },
  categoryLabel: {
    color:      "#555",
    fontSize:   12,
    fontWeight: "600",
  },
  categoryLabelActive: {
    color: "#FFD60A",
  },

  thumbnailStrip: {
    height: 104,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    alignItems:        "center",
    gap:               12,
  },
  thumbnailItem: {
    alignItems: "center",
    gap:        5,
  },
  filterName: {
    color:         "#555",
    fontSize:      9,
    fontWeight:    "600",
    letterSpacing: 0.4,
  },
  filterNameActive: {
    color: "#FFD60A",
  },

  dialArea: {
    alignItems:     "center",
    justifyContent: "center",
  },
  intensityLabel: {
    color:         "#FFF",
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 1.2,
    marginBottom:  4,
    textAlign:     "center",
  },
});
