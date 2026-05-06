import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  PanResponder,
  LayoutChangeEvent,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Vibration,
} from "react-native";
import {
  Canvas,
  Image,
  Path,
  Skia,
  FillType,
  Group,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedReaction,
  withTiming,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
} from "react-native-reanimated";

import { EditorStateManager } from "../state/EditorStateManager";
import { RulerDial } from "./RulerDial";

// ─── Constants ────────────────────────────────────────────────────────────────

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CropperProps { stateManager: EditorStateManager; }

const RATIOS = ["ORIGINAL", "SQUARE", "9:16", "4:5", "5:7", "3:4", "3:5", "2:3"];
const RATIO_VALUES: Record<string, number | null> = {
  ORIGINAL: null, SQUARE: 1,
  "9:16": 9/16, "4:5": 4/5, "5:7": 5/7, "3:4": 3/4, "3:5": 3/5, "2:3": 2/3,
};

const FADE_IN    = { duration: 120, easing: Easing.out(Easing.quad)  };
const FADE_OUT   = { duration: 600, easing: Easing.in(Easing.quad)   };
const RATIO_ANIM = { duration: 280, easing: Easing.out(Easing.cubic) };
const ZOOM_IN    = { duration: 400, easing: Easing.out(Easing.cubic) };
const ZOOM_OUT   = { duration: 250, easing: Easing.out(Easing.quad)  };

// Light haptic tick — swap for expo-haptics on iOS for a proper selection tick.
function triggerHapticTick() {
  try { Vibration.vibrate(10); } catch (_) {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Cropper = ({ stateManager }: CropperProps) => {
  const { cropRect: managerCropRect, flipX: managerFlipX, rotation: managerRotation, originalImage: image } = stateManager;

  // React state — UI labels only, never mutated during gestures
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [activeRatio,  setActiveRatio]  = useState("ORIGINAL");
  const [isLandscape,  setIsLandscape]  = useState(false);
  const [selectedTool, setSelectedTool] = useState<"straighten" | "vertical" | "horizontal">("straighten");

  // ── Crop rect — 4 SharedValues, entire hot path stays on UI thread ──────────
  const savedCrop = managerCropRect.value ?? { x: 0, y: 0, width: image.width(), height: image.height() };
  const cropXSV = useSharedValue(savedCrop.x);
  const cropYSV = useSharedValue(savedCrop.y);
  const cropWSV = useSharedValue(savedCrop.width);
  const cropHSV = useSharedValue(savedCrop.height);

  // ── Canvas layout as SharedValues so path worklets can read them ─────────────
  const imgAspect  = image.width() / image.height();
  const initDrawW  = Math.min(SCREEN_WIDTH, SCREEN_WIDTH * imgAspect);
  const initDrawH  = initDrawW / imgAspect;

  const xOffsetSV    = useSharedValue((SCREEN_WIDTH - initDrawW) / 2);
  const yOffsetSV    = useSharedValue((SCREEN_WIDTH - initDrawH) / 2);
  const scaleRatioSV = useSharedValue(image.width() / initDrawW);
  const canvasWSV    = useSharedValue(SCREEN_WIDTH);
  const canvasHSV    = useSharedValue(SCREEN_WIDTH);

  // ── Transform SharedValues ───────────────────────────────────────────────────
  const straightenSV  = useSharedValue(0);
  const pitchSV       = useSharedValue(0);
  const yawSV         = useSharedValue(0);
  const gridOpacitySV = useSharedValue(0);
  const drawWidthSV   = useSharedValue(initDrawW);
  const drawHeightSV  = useSharedValue(initDrawH);

  // ── Auto-zoom SharedValues — applied as outer Animated.View transform ────────
  const zoomScaleSV = useSharedValue(1);
  const zoomTxSV    = useSharedValue(0);
  const zoomTySV    = useSharedValue(0);

  // selectedTool as SV so the label worklet always reads the current value
  const selectedToolSV = useSharedValue(0); // 0=straighten 1=vertical 2=horizontal

  // ─── Haptic tick when straighten crosses 0° ──────────────────────────────────

  useAnimatedReaction(
    () => straightenSV.value > 0,
    (isPositive, wasPositive) => {
      if (wasPositive !== null && isPositive !== wasPositive) {
        runOnJS(triggerHapticTick)();
      }
    },
  );

  // ─── Layout ──────────────────────────────────────────────────────────────────

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasLayout({ width, height });

    const iRatio = image.width() / image.height();
    const cRatio = width / height;
    const dw = iRatio > cRatio ? width  : height * iRatio;
    const dh = iRatio > cRatio ? width / iRatio : height;

    drawWidthSV.value  = dw;
    drawHeightSV.value = dh;
    xOffsetSV.value    = (width  - dw) / 2;
    yOffsetSV.value    = (height - dh) / 2;
    scaleRatioSV.value = image.width() / dw;
    canvasWSV.value    = width;
    canvasHSV.value    = height;
  };

  // React-side layout — used only for canvas style, never during gestures
  const imgRatio    = image.width() / image.height();
  const canvasRatio = canvasLayout.width / canvasLayout.height;
  const drawWidth   = imgRatio > canvasRatio ? canvasLayout.width  : canvasLayout.height * imgRatio;
  const drawHeight  = imgRatio > canvasRatio ? canvasLayout.width / imgRatio : canvasLayout.height;
  const xOffset     = (canvasLayout.width  - drawWidth)  / 2;
  const yOffset     = (canvasLayout.height - drawHeight) / 2;

  // ─── Ratio animation — withTiming on SVs, zero React renders ─────────────────

  const applyRatio = useCallback((ratio: string, landscape: boolean) => {
    if (!RATIO_VALUES.hasOwnProperty(ratio) && ratio !== "ORIGINAL") return;
    const imgW = image.width(), imgH = image.height();
    let r = RATIO_VALUES[ratio];
    if (ratio === "ORIGINAL") r = imgW / imgH;
    if (!r) return;
    if (landscape && ratio !== "SQUARE" && ratio !== "ORIGINAL") r = 1 / r;

    let tw = imgW, th = tw / r;
    if (th > imgH) { th = imgH; tw = th * r; }

    const ex = ratio === "ORIGINAL" ? 0 : (imgW - tw) / 2;
    const ey = ratio === "ORIGINAL" ? 0 : (imgH - th) / 2;
    const ew = ratio === "ORIGINAL" ? imgW : tw;
    const eh = ratio === "ORIGINAL" ? imgH : th;

    cropXSV.value = withTiming(ex, RATIO_ANIM);
    cropYSV.value = withTiming(ey, RATIO_ANIM);
    cropWSV.value = withTiming(ew, RATIO_ANIM);
    cropHSV.value = withTiming(eh, RATIO_ANIM);
  }, []);

  // ─── Image transform worklet ──────────────────────────────────────────────────
  //
  // Auto-scale formula (user spec):
  //   S = max( (W|cosθ| + H|sinθ|) / W,  (W|sinθ| + H|cosθ|) / H )
  //
  // This guarantees S ≥ 1 for any θ, growing continuously from 1 at θ=0
  // so the image always covers the crop frame with no black corners.
  // Pivot is the image centre, matching the existing Group origin.

  const transform = useDerivedValue(() => {
    const θ     = (managerRotation.value + straightenSV.value) * Math.PI / 180;
    const pitch = pitchSV.value * Math.PI / 180;
    const yaw   = yawSV.value   * Math.PI / 180;

    const W    = drawWidthSV.value;
    const H    = drawHeightSV.value || 1;
    const cosT = Math.cos(Math.abs(θ));
    const sinT = Math.sin(Math.abs(θ));

    // Minimum scale to keep all four corners covered (Paeth / user formula)
    const straightenScale = Math.max(
      (W * cosT + H * sinT) / W,
      (W * sinT + H * cosT) / H,
    );

    // Perspective axes — same cosine-based scale
    const pitchScale = Math.abs(pitch) > 0.001 ? 1 / Math.cos(Math.abs(pitch)) : 1;
    const yawScale   = Math.abs(yaw)   > 0.001 ? 1 / Math.cos(Math.abs(yaw))   : 1;

    const s = straightenScale * pitchScale * yawScale;

    return [
      { perspective: 700 as number },
      { rotateX: pitch },
      { rotateY: yaw   },
      { rotate:  θ     },
      { scaleX: s * (managerFlipX.value as number) },
      { scaleY: s },
    ];
  });

  // ─── Overlay paths — UI thread, no React renders ──────────────────────────────

  const overlayPath = useDerivedValue(() => {
    const p  = Skia.Path.Make();
    const cw = canvasWSV.value;
    const ch = canvasHSV.value;
    const sr = scaleRatioSV.value;
    const cx = xOffsetSV.value + cropXSV.value / sr;
    const cy = yOffsetSV.value + cropYSV.value / sr;
    const rw = cropWSV.value / sr;
    const rh = cropHSV.value / sr;
    p.addRect(Skia.XYWHRect(0, 0, cw, ch));
    p.addRect(Skia.XYWHRect(cx, cy, rw, rh));
    p.setFillType(FillType.EvenOdd);
    return p;
  });

  const gridPath = useDerivedValue(() => {
    const p  = Skia.Path.Make();
    const sr = scaleRatioSV.value;
    const cx = xOffsetSV.value + cropXSV.value / sr;
    const cy = yOffsetSV.value + cropYSV.value / sr;
    const rw = cropWSV.value / sr;
    const rh = cropHSV.value / sr;
    const tw = rw / 3, th = rh / 3;
    p.moveTo(cx + tw,     cy); p.lineTo(cx + tw,     cy + rh);
    p.moveTo(cx + tw * 2, cy); p.lineTo(cx + tw * 2, cy + rh);
    p.moveTo(cx, cy + th);     p.lineTo(cx + rw, cy + th);
    p.moveTo(cx, cy + th * 2); p.lineTo(cx + rw, cy + th * 2);
    p.addRect(Skia.XYWHRect(cx, cy, rw, rh));
    return p;
  });

  const handlesPath = useDerivedValue(() => {
    const p  = Skia.Path.Make();
    const sr = scaleRatioSV.value;
    const cx = xOffsetSV.value + cropXSV.value / sr;
    const cy = yOffsetSV.value + cropYSV.value / sr;
    const rw = cropWSV.value / sr;
    const rh = cropHSV.value / sr;
    const hl = 22;
    p.moveTo(cx,        cy + hl); p.lineTo(cx,       cy);       p.lineTo(cx + hl,      cy);
    p.moveTo(cx+rw-hl,  cy);      p.lineTo(cx + rw,  cy);       p.lineTo(cx + rw,       cy + hl);
    p.moveTo(cx,        cy+rh-hl);p.lineTo(cx,        cy + rh); p.lineTo(cx + hl,      cy + rh);
    p.moveTo(cx+rw-hl,  cy + rh); p.lineTo(cx + rw,  cy + rh); p.lineTo(cx + rw,       cy+rh-hl);
    return p;
  });

  // ─── Auto-zoom — Animated.View wrapping the canvas ───────────────────────────

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      // scale first (around view centre), then translate in pre-scale coords
      { scale:      zoomScaleSV.value },
      { translateX: zoomTxSV.value    },
      { translateY: zoomTySV.value    },
    ],
  }));

  const cancelZoom = () => {
    cancelAnimation(zoomScaleSV);
    cancelAnimation(zoomTxSV);
    cancelAnimation(zoomTySV);
    zoomScaleSV.value = withTiming(1, ZOOM_OUT);
    zoomTxSV.value    = withTiming(0, ZOOM_OUT);
    zoomTySV.value    = withTiming(0, ZOOM_OUT);
  };

  const triggerZoom = () => {
    const sr = scaleRatioSV.value;
    const cw_canvas = canvasWSV.value;
    const ch_canvas = canvasHSV.value;
    const cx = xOffsetSV.value + cropXSV.value / sr;
    const cy = yOffsetSV.value + cropYSV.value / sr;
    const cw = cropWSV.value / sr;
    const ch = cropHSV.value / sr;

    if (cw <= 0 || ch <= 0) return;

    // Scale so crop fills the viewport (letterbox if needed)
    const targetScale = Math.min(cw_canvas / cw, ch_canvas / ch);
    // Translate so crop centre lands at canvas centre (in pre-scale coords)
    const targetTx = cw_canvas / 2 - cx - cw / 2;
    const targetTy = ch_canvas / 2 - cy - ch / 2;

    zoomScaleSV.value = withDelay(1000, withTiming(targetScale, ZOOM_IN));
    zoomTxSV.value    = withDelay(1000, withTiming(targetTx,    ZOOM_IN));
    zoomTySV.value    = withDelay(1000, withTiming(targetTy,    ZOOM_IN));

    // Grid fades out after zoom animation completes (1000ms delay + 400ms anim)
    gridOpacitySV.value = withDelay(1400, withTiming(0, FADE_OUT));
  };

  // ─── Dial ─────────────────────────────────────────────────────────────────────

  const handleDialChange = useCallback((val: number) => {
    "worklet";
    if (selectedToolSV.value === 0) straightenSV.value = val;
    else if (selectedToolSV.value === 1) pitchSV.value = val;
    else yawSV.value = val;
  }, [selectedToolSV, straightenSV, pitchSV, yawSV]);

  const activeDialSV =
    selectedTool === "straighten" ? straightenSV :
    selectedTool === "vertical"   ? pitchSV      : yawSV;

  const dialLabelProps = useAnimatedProps(() => {
    const t  = selectedToolSV.value;
    const sv = t === 0 ? straightenSV : t === 1 ? pitchSV : yawSV;
    const v  = Math.round(sv.value);
    const prefix = t === 0 ? "STRAIGHTEN" : t === 1 ? "VERTICAL" : "HORIZONTAL";
    const label  = `${prefix}  ${v > 0 ? "+" : ""}${v}°`;
    return { text: label, defaultValue: label };
  });

  // ─── Crop pan responder ───────────────────────────────────────────────────────

  const dragState = useRef<{
    handle: "tl"|"tr"|"bl"|"br"|"center"|null;
    startX: number; startY: number; startW: number; startH: number;
    lockedRatio: number;
  }>({ handle: null, startX: 0, startY: 0, startW: 0, startH: 0, lockedRatio: 1 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (evt) => {
        // Cancel any pending zoom and snap back to 1:1
        cancelZoom();

        gridOpacitySV.value = withTiming(1, FADE_IN);

        const sr = scaleRatioSV.value;
        const cx = xOffsetSV.value + cropXSV.value / sr;
        const cy = yOffsetSV.value + cropYSV.value / sr;
        const cw = cropWSV.value / sr;
        const ch = cropHSV.value / sr;

        const { locationX: lx, locationY: ly } = evt.nativeEvent;
        const S = 44;
        let handle: typeof dragState.current.handle = null;
        if      (Math.abs(lx - cx)      < S && Math.abs(ly - cy)      < S) handle = "tl";
        else if (Math.abs(lx - cx - cw) < S && Math.abs(ly - cy)      < S) handle = "tr";
        else if (Math.abs(lx - cx)      < S && Math.abs(ly - cy - ch) < S) handle = "bl";
        else if (Math.abs(lx - cx - cw) < S && Math.abs(ly - cy - ch) < S) handle = "br";
        else if (lx >= cx && lx <= cx + cw && ly >= cy && ly <= cy + ch)   handle = "center";

        dragState.current = {
          handle,
          startX: cropXSV.value, startY: cropYSV.value,
          startW: cropWSV.value, startH: cropHSV.value,
          lockedRatio: cropWSV.value / (cropHSV.value || 1),
        };
      },

      onPanResponderMove: (_, g) => {
        const { handle, startX, startY, startW, startH } = dragState.current;
        if (!handle) return;

        const sr = scaleRatioSV.value;
        const iw = image.width(), ih = image.height();
        const dx = g.dx * sr, dy = g.dy * sr;
        let nx = startX, ny = startY, nw = startW, nh = startH;
        const min = 60 * sr;

        if (handle === "center") {
          nx = Math.max(0, Math.min(startX + dx, iw - nw));
          ny = Math.max(0, Math.min(startY + dy, ih - nh));
        } else {
          if (handle === "tl" || handle === "bl") { nx += dx; nw -= dx; }
          if (handle === "tr" || handle === "br") { nw += dx; }
          if (handle === "tl" || handle === "tr") { ny += dy; nh -= dy; }
          if (handle === "bl" || handle === "br") { nh += dy; }
          if (nw < min) { nx = startX; nw = startW; }
          if (nh < min) { ny = startY; nh = startH; }
          nx = Math.max(0, Math.min(nx, iw - nw));
          ny = Math.max(0, Math.min(ny, ih - nh));
          if (nx + nw > iw) nw = iw - nx;
          if (ny + nh > ih) nh = ih - ny;
        }

        cropXSV.value = nx;
        cropYSV.value = ny;
        cropWSV.value = nw;
        cropHSV.value = nh;
      },

      onPanResponderRelease: () => {
        // Sync to manager
        managerCropRect.value = {
          x: cropXSV.value, y: cropYSV.value,
          width: cropWSV.value, height: cropHSV.value,
        };
        // Trigger auto-zoom after 1 second; grid fades out when zoom finishes
        triggerZoom();
      },
      onPanResponderTerminate: () => {
        gridOpacitySV.value = withTiming(0, FADE_OUT);
      },
    }),
  ).current;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      <Animated.View style={[styles.canvasContainer, zoomStyle]} onLayout={onLayout} {...panResponder.panHandlers}>
        {canvasLayout.height > 0 && (
          <Canvas
            style={{ width: canvasLayout.width, height: canvasLayout.height }}
            pointerEvents="none"
          >
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
              />
            </Group>

            {/* Semi-transparent overlay outside crop — rgba(0,0,0,0.6) */}
            <Path path={overlayPath} color="rgba(0,0,0,0.6)" />

            {/* Rule-of-thirds grid — visible during gesture, fades after zoom */}
            <Group opacity={gridOpacitySV}>
              <Path path={gridPath} color="rgba(255,255,255,0.4)" style="stroke" strokeWidth={0.7} />
            </Group>

            {/* L-shaped corner handles */}
            <Path path={handlesPath} color="#FFF" style="stroke" strokeWidth={3} strokeJoin="round" strokeCap="round" />
          </Canvas>
        )}
      </Animated.View>

      <View style={styles.controls}>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ratioList}
          style={styles.ratioStrip}
        >
          {RATIOS.map(r => (
            <TouchableOpacity key={r} onPress={() => { setActiveRatio(r); applyRatio(r, isLandscape); }}>
              <Text style={[styles.ratioText, activeRatio === r && styles.ratioTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.toolRow}>
          {(["straighten", "vertical", "horizontal"] as const).map((tool, idx) => (
            <TouchableOpacity
              key={tool}
              style={[styles.toolBtn, selectedTool === tool && styles.toolBtnActive]}
              onPress={() => { setSelectedTool(tool); selectedToolSV.value = idx; }}
            >
              {tool === "straighten" && <StraightenIcon  active={selectedTool === tool} />}
              {tool === "vertical"   && <VerticalIcon    active={selectedTool === tool} />}
              {tool === "horizontal" && <HorizontalIcon  active={selectedTool === tool} />}
            </TouchableOpacity>
          ))}
        </View>

        <AnimatedTextInput
          animatedProps={dialLabelProps}
          editable={false}
          style={styles.dialLabel}
        />

        <RulerDial
          value={activeDialSV.value}
          min={-45}
          max={45}
          onChange={handleDialChange}
        />

      </View>

    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ICON_SIZE = 26;

const StraightenIcon = ({ active }: { active: boolean }) => {
  const c = active ? "#FFD60A" : "#888";
  return (
    <Canvas style={{ width: ICON_SIZE, height: ICON_SIZE }}>
      <Path path={`M3 ${ICON_SIZE/2} L${ICON_SIZE-3} ${ICON_SIZE/2}`} style="stroke" strokeWidth={2} color={c} strokeCap="round" />
      <Path path={`M${ICON_SIZE/2} ${ICON_SIZE/2} L${ICON_SIZE/2+5} ${ICON_SIZE/2-6}`} style="stroke" strokeWidth={2} color={c} strokeCap="round" />
    </Canvas>
  );
};

const VerticalIcon = ({ active }: { active: boolean }) => {
  const c = active ? "#FFD60A" : "#888";
  return (
    <Canvas style={{ width: ICON_SIZE, height: ICON_SIZE }}>
      <Path
        path={`M6 3 L${ICON_SIZE-6} 3 L${ICON_SIZE-2} ${ICON_SIZE-3} L2 ${ICON_SIZE-3} Z`}
        style="stroke" strokeWidth={1.8} color={c} strokeJoin="round"
      />
    </Canvas>
  );
};

const HorizontalIcon = ({ active }: { active: boolean }) => {
  const c = active ? "#FFD60A" : "#888";
  return (
    <Canvas style={{ width: ICON_SIZE, height: ICON_SIZE }}>
      <Path
        path={`M3 6 L3 ${ICON_SIZE-6} L${ICON_SIZE-3} ${ICON_SIZE-2} L${ICON_SIZE-3} 2 Z`}
        style="stroke" strokeWidth={1.8} color={c} strokeJoin="round"
      />
    </Canvas>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#000" },
  canvasContainer: { flex: 1, overflow: "hidden" },
  controls:        { backgroundColor: "#000", paddingBottom: 8 },

  ratioStrip: { height: 48 },
  ratioList: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  ratioText:       { color: "#555",    fontSize: 12, fontWeight: "600" },
  ratioTextActive: { color: "#FFD60A" },

  toolRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingBottom: 8,
  },
  toolBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#1C1C1E",
  },
  toolBtnActive: { backgroundColor: "#2C2C2E" },

  dialLabel: {
    color: "#FFF", fontSize: 11, fontWeight: "700",
    letterSpacing: 1.2, textAlign: "center", marginBottom: 4,
  },
});
