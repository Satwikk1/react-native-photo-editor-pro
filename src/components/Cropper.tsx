import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions, PanResponder, LayoutChangeEvent, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Canvas, Image, SkImage, Path, Skia, PaintStyle, FillType, Group } from '@shopify/react-native-skia';

import { EditorStateManager } from "../state/EditorStateManager";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Rect { x: number; y: number; width: number; height: number; }

interface CropperProps {
  stateManager: EditorStateManager;
}

const RATIOS = ['ORIGINAL', 'FREEFORM', 'SQUARE', '9:16', '4:5', '5:7', '3:4', '3:5', '2:3'];

import { RulerDial } from "./RulerDial";
import { useDerivedValue } from "react-native-reanimated";

export const Cropper = ({ stateManager }: CropperProps) => {
  const {
    cropRect: managerCropRect,
    flipX: managerFlipX,
    rotation: managerRotation,
    originalImage: image,
  } = stateManager;

  const [cropRect, setCropRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!cropRect) {
      setCropRect(managerCropRect.value);
    }
  }, []);

  useEffect(() => {
    if (cropRect) {
      managerCropRect.value = cropRect;
    }
  }, [cropRect]);

  const transform = useDerivedValue(() => [
    { rotate: ((managerRotation.value + straighten) * Math.PI) / 180 },
    { scaleX: managerFlipX.value },
    { skewX: hPerspective * 0.01 },
    { skewY: vPerspective * 0.01 },
  ]);
  const [canvasLayout, setCanvasLayout] = useState({
    width: SCREEN_WIDTH,
    height: 400,
  });
  const [activeRatio, setActiveRatio] = useState("FREEFORM");
  const [isLandscape, setIsLandscape] = useState(false);
  const [selectedTool, setSelectedTool] = useState<
    "straighten" | "vertical" | "horizontal"
  >("straighten");
  const [straighten, setStraighten] = useState(0);
  const [vPerspective, setVPerspective] = useState(0);
  const [hPerspective, setHPerspective] = useState(0);

  // Animation ref
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeRatio === "FREEFORM") return;
    if (!cropRect) return;

    const imgW = image.width();
    const imgH = image.height();

    let targetRatio = 1;
    if (activeRatio === "SQUARE") targetRatio = 1;
    else if (activeRatio === "9:16") targetRatio = 9 / 16;
    else if (activeRatio === "4:5") targetRatio = 4 / 5;
    else if (activeRatio === "5:7") targetRatio = 5 / 7;
    else if (activeRatio === "3:4") targetRatio = 3 / 4;
    else if (activeRatio === "3:5") targetRatio = 3 / 5;
    else if (activeRatio === "2:3") targetRatio = 2 / 3;
    else if (activeRatio === "ORIGINAL") targetRatio = imgW / imgH;

    if (isLandscape && activeRatio !== "SQUARE" && activeRatio !== "ORIGINAL") {
      targetRatio = 1 / targetRatio;
    }

    let targetW = imgW;
    let targetH = targetW / targetRatio;

    if (targetH > imgH) {
      targetH = imgH;
      targetW = targetH * targetRatio;
    }

    const targetX = (imgW - targetW) / 2;
    const targetY = (imgH - targetH) / 2;

    const startRect = { ...cropRect };
    const endRect = { x: targetX, y: targetY, width: targetW, height: targetH };

    if (activeRatio === "ORIGINAL") {
      endRect.x = 0;
      endRect.y = 0;
      endRect.width = imgW;
      endRect.height = imgH;
    }

    let startTime: number | null = null;
    const duration = 300;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);

      // Easing (ease-out cubic)
      const ease = 1 - Math.pow(1 - progress, 3);

      setCropRect({
        x: startRect.x + (endRect.x - startRect.x) * ease,
        y: startRect.y + (endRect.y - startRect.y) * ease,
        width: startRect.width + (endRect.width - startRect.width) * ease,
        height: startRect.height + (endRect.height - startRect.height) * ease,
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [activeRatio, isLandscape, image]);

  useEffect(() => {
    if (!cropRect) {
      setCropRect({ x: 0, y: 0, width: image.width(), height: image.height() });
    }
  }, [image, cropRect, setCropRect]);

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvasLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const imgRatio = image.width() / image.height();
  const canvasRatio = canvasLayout.width / canvasLayout.height;

  let drawWidth = canvasLayout.width;
  let drawHeight = canvasLayout.height;

  if (imgRatio > canvasRatio) {
    drawHeight = canvasLayout.width / imgRatio;
  } else {
    drawWidth = canvasLayout.height * imgRatio;
  }

  const xOffset = (canvasLayout.width - drawWidth) / 2;
  const yOffset = (canvasLayout.height - drawHeight) / 2;

  const scaleRatio = image.width() / drawWidth;

  const dragState = useRef<{
    activeHandle: "tl" | "tr" | "bl" | "br" | "center" | null;
    startCrop: Rect | null;
    startX: number;
    startY: number;
  }>({ activeHandle: null, startCrop: null, startX: 0, startY: 0 });

  const getHandle = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    cw: number,
    ch: number,
  ) => {
    const HIT_SLOP = 45;
    if (Math.abs(x - cx) < HIT_SLOP && Math.abs(y - cy) < HIT_SLOP) return "tl";
    if (Math.abs(x - (cx + cw)) < HIT_SLOP && Math.abs(y - cy) < HIT_SLOP)
      return "tr";
    if (Math.abs(x - cx) < HIT_SLOP && Math.abs(y - (cy + ch)) < HIT_SLOP)
      return "bl";
    if (
      Math.abs(x - (cx + cw)) < HIT_SLOP &&
      Math.abs(y - (cy + ch)) < HIT_SLOP
    )
      return "br";

    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return "center";
    return null;
  };

  const stateRef = useRef({
    cropRect,
    scaleRatio,
    xOffset,
    yOffset,
    imageWidth: image.width(),
    imageHeight: image.height(),
  });
  stateRef.current = {
    cropRect,
    scaleRatio,
    xOffset,
    yOffset,
    imageWidth: image.width(),
    imageHeight: image.height(),
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const {
          cropRect: currentCropRect,
          scaleRatio: sRatio,
          xOffset: xOff,
          yOffset: yOff,
        } = stateRef.current;
        if (!currentCropRect) return;
        const { locationX, locationY } = evt.nativeEvent;

        const cx = xOff + currentCropRect.x / sRatio;
        const cy = yOff + currentCropRect.y / sRatio;
        const cw = currentCropRect.width / sRatio;
        const ch = currentCropRect.height / sRatio;

        const handle = getHandle(locationX, locationY, cx, cy, cw, ch);
        dragState.current = {
          activeHandle: handle,
          startCrop: { ...currentCropRect },
          startX: locationX,
          startY: locationY,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const { activeHandle, startCrop } = dragState.current;
        if (!activeHandle || !startCrop) return;

        const {
          scaleRatio: sRatio,
          imageWidth,
          imageHeight,
          cropRect: currentCropRect,
        } = stateRef.current;

        const dx = gestureState.dx * sRatio;
        const dy = gestureState.dy * sRatio;

        let newX = startCrop.x;
        let newY = startCrop.y;
        let newW = startCrop.width;
        let newH = startCrop.height;

        const minSize = 100 * sRatio;

        if (activeHandle === "center") {
          newX += dx;
          newY += dy;
        } else {
          if (activeHandle === "tl" || activeHandle === "bl") {
            newX += dx;
            newW -= dx;
          }
          if (activeHandle === "tr" || activeHandle === "br") {
            newW += dx;
          }
          if (activeHandle === "tl" || activeHandle === "tr") {
            newY += dy;
            newH -= dy;
          }
          if (activeHandle === "bl" || activeHandle === "br") {
            newH += dy;
          }
        }

        if (newW < minSize) {
          newX = currentCropRect!.x;
          newW = currentCropRect!.width;
        }
        if (newH < minSize) {
          newY = currentCropRect!.y;
          newH = currentCropRect!.height;
        }

        newX = Math.max(0, Math.min(newX, imageWidth - newW));
        newY = Math.max(0, Math.min(newY, imageHeight - newH));
        if (newX + newW > imageWidth) newW = imageWidth - newX;
        if (newY + newH > imageHeight) newH = imageHeight - newY;

        setCropRect({ x: newX, y: newY, width: newW, height: newH });
      },
    }),
  ).current;

  const overlayPath = Skia.Path.Make();
  const gridPath = Skia.Path.Make();
  const handlesPath = Skia.Path.Make();

  if (cropRect && canvasLayout.height > 0) {
    const cx = xOffset + cropRect.x / scaleRatio;
    const cy = yOffset + cropRect.y / scaleRatio;
    const cw = cropRect.width / scaleRatio;
    const ch = cropRect.height / scaleRatio;

    overlayPath.addRect(
      Skia.XYWHRect(0, 0, canvasLayout.width, canvasLayout.height),
    );
    overlayPath.addRect(Skia.XYWHRect(cx, cy, cw, ch));
    overlayPath.setFillType(FillType.EvenOdd);

    const thirdW = cw / 3;
    const thirdH = ch / 3;

    gridPath.moveTo(cx + thirdW, cy);
    gridPath.lineTo(cx + thirdW, cy + ch);
    gridPath.moveTo(cx + thirdW * 2, cy);
    gridPath.lineTo(cx + thirdW * 2, cy + ch);

    gridPath.moveTo(cx, cy + thirdH);
    gridPath.lineTo(cx + cw, cy + thirdH);
    gridPath.moveTo(cx, cy + thirdH * 2);
    gridPath.lineTo(cx + cw, cy + thirdH * 2);

    gridPath.addRect(Skia.XYWHRect(cx, cy, cw, ch));

    const hl = 20;
    handlesPath.moveTo(cx, cy + hl);
    handlesPath.lineTo(cx, cy);
    handlesPath.lineTo(cx + hl, cy);
    handlesPath.moveTo(cx + cw - hl, cy);
    handlesPath.lineTo(cx + cw, cy);
    handlesPath.lineTo(cx + cw, cy + hl);
    handlesPath.moveTo(cx, cy + ch - hl);
    handlesPath.lineTo(cx, cy + ch);
    handlesPath.lineTo(cx + hl, cy + ch);
    handlesPath.moveTo(cx + cw - hl, cy + ch);
    handlesPath.lineTo(cx + cw, cy + ch);
    handlesPath.lineTo(cx + cw, cy + ch - hl);
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.canvasContainer}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        {canvasLayout.height > 0 && (
          <Canvas
            style={{ width: canvasLayout.width, height: canvasLayout.height }}
            pointerEvents="none"
          >
            <Group
              origin={{
                x: xOffset + drawWidth / 2,
                y: yOffset + drawHeight / 2,
              }}
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
            {cropRect && (
              <>
                <Path path={overlayPath} color="rgba(0, 0, 0, 0.6)" />
                <Path
                  path={gridPath}
                  color="rgba(255, 255, 255, 0.5)"
                  style="stroke"
                  strokeWidth={1}
                />
                <Path
                  path={handlesPath}
                  color="white"
                  style="stroke"
                  strokeWidth={4}
                  strokeJoin="round"
                  strokeCap="round"
                />
              </>
            )}
          </Canvas>
        )}
      </View>

      {/* Apple Style Toolbar */}
      <View style={styles.ratioListContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ratioList}
        >
          {RATIOS.map((ratio) => (
            <TouchableOpacity key={ratio} onPress={() => setActiveRatio(ratio)}>
              <Text
                style={[
                  styles.ratioText,
                  activeRatio === ratio && styles.activeRatioText,
                ]}
              >
                {ratio}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Perspective Tools */}
      <View style={styles.perspectiveToolbar}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setSelectedTool("straighten")}
        >
          <View
            style={[
              styles.toolIconCircle,
              selectedTool === "straighten" && styles.activeToolCircle,
            ]}
          >
            <View style={styles.straightenLine} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setSelectedTool("vertical")}
        >
          <View
            style={[
              styles.trapezoidV,
              selectedTool === "vertical" && styles.activeToolTrapezoid,
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setSelectedTool("horizontal")}
        >
          <View
            style={[
              styles.trapezoidH,
              selectedTool === "horizontal" && styles.activeToolTrapezoid,
            ]}
          />
        </TouchableOpacity>
      </View>

      <RulerDial
        value={
          selectedTool === "straighten"
            ? straighten
            : selectedTool === "vertical"
              ? vPerspective
              : hPerspective
        }
        min={-45}
        max={45}
        onChange={(val) => {
          if (selectedTool === "straighten") setStraighten(val);
          else if (selectedTool === "vertical") setVPerspective(val);
          else setHPerspective(val);
        }}
      />

      <View style={styles.orientationToolbar}>
        <View style={styles.orientationToggles}>
          <TouchableOpacity
            style={[
              styles.orientationBtn,
              !isLandscape && styles.activeOrientationBtn,
            ]}
            onPress={() => setIsLandscape(false)}
          >
            <View style={styles.rectPortrait} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.orientationBtn,
              isLandscape && styles.activeOrientationBtn,
            ]}
            onPress={() => setIsLandscape(true)}
          >
            <View style={styles.rectLandscape} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.lockBtn}>
          <Text style={styles.lockIcon}>🔓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  canvasContainer: { flex: 1, overflow: 'hidden' },
  controls: {
    height: 160,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  ratioListContainer: {
    paddingVertical: 15,
  },
  ratioList: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ratioText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  activeRatioText: {
    color: '#FFD60A',
  },
  orientationToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  orientationToggles: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  orientationBtn: {
    padding: 10,
    backgroundColor: '#1C1C1E',
  },
  activeOrientationBtn: {
    backgroundColor: '#333336',
  },
  rectPortrait: {
    width: 14,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderRadius: 2,
  },
  rectLandscape: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderRadius: 2,
  },
  lockBtn: {
    position: 'absolute',
    right: 20,
    padding: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  lockIcon: {
    fontSize: 16,
  },
  perspectiveToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 10,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  activeToolBtn: {
    backgroundColor: '#333',
  },
  toolIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeToolCircle: {
    borderColor: '#FFD60A',
  },
  straightenLine: {
    width: 18,
    height: 1.5,
    backgroundColor: '#8E8E93',
  },
  trapezoidV: {
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#8E8E93',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  trapezoidH: {
    width: 18,
    height: 18,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#8E8E93',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  activeToolTrapezoid: {
    borderColor: '#FFD60A',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  valueBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  valueText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dialContainer: {
    height: 50,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dialTicksContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
  },
  dialTicks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialIndicator: {
    width: 2,
    height: 20,
    backgroundColor: '#FFD60A',
    position: 'absolute',
    top: 15,
  },
  tick: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 3,
  },
  tickMinor: {
    height: 8,
  },
  tickMajor: {
    height: 14,
    backgroundColor: '#666',
  },
  tickCenter: {
    height: 20,
    backgroundColor: '#FFD60A',
    width: 2,
  },
});
