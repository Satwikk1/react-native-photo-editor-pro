import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions, PanResponder, LayoutChangeEvent, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Canvas, Image, SkImage, Path, Skia, PaintStyle, FillType } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Rect { x: number; y: number; width: number; height: number; }

interface CropperProps {
  image: SkImage;
  cropRect: Rect | null;
  setCropRect: (val: Rect) => void;
}

const RATIOS = ['ORIGINAL', 'FREEFORM', 'SQUARE', '9:16', '4:5', '5:7', '3:4', '3:5', '2:3'];

const RulerDial = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const startValue = useRef(value);
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startValue.current = value;
    },
    onPanResponderMove: (_, gestureState) => {
      const delta = gestureState.dx * 0.2;
      let newVal = startValue.current + delta;
      newVal = Math.max(-45, Math.min(45, newVal));
      onChange(newVal);
    },
  })).current;

  return (
    <View style={styles.dialWrapper}>
      {/* Active Value Bubble */}
      <View style={styles.valueBubble}>
        <Text style={styles.valueText}>{Math.round(value)}</Text>
      </View>
      <View style={styles.dialContainer} {...panResponder.panHandlers}>
        <View style={styles.dialDot} />
        <View style={styles.dialTicks}>
          {Array.from({ length: 41 }).map((_, i) => (
            <View key={i} style={[styles.tick, i % 5 === 0 ? styles.tickMajor : styles.tickMinor, i === 20 && styles.tickCenter]} />
          ))}
        </View>
      </View>
    </View>
  );
};

export const Cropper = ({ image, cropRect, setCropRect }: CropperProps) => {
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH, height: 400 });
  const [activeRatio, setActiveRatio] = useState('FREEFORM');
  const [rotation, setRotation] = useState(0);

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
    activeHandle: 'tl' | 'tr' | 'bl' | 'br' | 'center' | null;
    startCrop: Rect | null;
    startX: number;
    startY: number;
  }>({ activeHandle: null, startCrop: null, startX: 0, startY: 0 });

  const getHandle = (x: number, y: number, cx: number, cy: number, cw: number, ch: number) => {
    const HIT_SLOP = 45; 
    if (Math.abs(x - cx) < HIT_SLOP && Math.abs(y - cy) < HIT_SLOP) return 'tl';
    if (Math.abs(x - (cx + cw)) < HIT_SLOP && Math.abs(y - cy) < HIT_SLOP) return 'tr';
    if (Math.abs(x - cx) < HIT_SLOP && Math.abs(y - (cy + ch)) < HIT_SLOP) return 'bl';
    if (Math.abs(x - (cx + cw)) < HIT_SLOP && Math.abs(y - (cy + ch)) < HIT_SLOP) return 'br';
    
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return 'center';
    return null;
  };

  const stateRef = useRef({ cropRect, scaleRatio, xOffset, yOffset, imageWidth: image.width(), imageHeight: image.height() });
  stateRef.current = { cropRect, scaleRatio, xOffset, yOffset, imageWidth: image.width(), imageHeight: image.height() };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { cropRect: currentCropRect, scaleRatio: sRatio, xOffset: xOff, yOffset: yOff } = stateRef.current;
        if (!currentCropRect) return;
        const { locationX, locationY } = evt.nativeEvent;
        
        const cx = xOff + (currentCropRect.x / sRatio);
        const cy = yOff + (currentCropRect.y / sRatio);
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
        
        const { scaleRatio: sRatio, imageWidth, imageHeight, cropRect: currentCropRect } = stateRef.current;

        const dx = gestureState.dx * sRatio;
        const dy = gestureState.dy * sRatio;

        let newX = startCrop.x;
        let newY = startCrop.y;
        let newW = startCrop.width;
        let newH = startCrop.height;

        const minSize = 100 * sRatio; 

        if (activeHandle === 'center') {
          newX += dx;
          newY += dy;
        } else {
          if (activeHandle === 'tl' || activeHandle === 'bl') {
            newX += dx;
            newW -= dx;
          }
          if (activeHandle === 'tr' || activeHandle === 'br') {
            newW += dx;
          }
          if (activeHandle === 'tl' || activeHandle === 'tr') {
            newY += dy;
            newH -= dy;
          }
          if (activeHandle === 'bl' || activeHandle === 'br') {
            newH += dy;
          }
        }

        if (newW < minSize) { newX = currentCropRect!.x; newW = currentCropRect!.width; }
        if (newH < minSize) { newY = currentCropRect!.y; newH = currentCropRect!.height; }

        newX = Math.max(0, Math.min(newX, imageWidth - newW));
        newY = Math.max(0, Math.min(newY, imageHeight - newH));
        if (newX + newW > imageWidth) newW = imageWidth - newX;
        if (newY + newH > imageHeight) newH = imageHeight - newY;

        setCropRect({ x: newX, y: newY, width: newW, height: newH });
      },
    })
  ).current;

  const overlayPath = Skia.Path.Make();
  const gridPath = Skia.Path.Make();
  const handlesPath = Skia.Path.Make();

  if (cropRect && canvasLayout.height > 0) {
    const cx = xOffset + (cropRect.x / scaleRatio);
    const cy = yOffset + (cropRect.y / scaleRatio);
    const cw = cropRect.width / scaleRatio;
    const ch = cropRect.height / scaleRatio;

    overlayPath.addRect(Skia.XYWHRect(0, 0, canvasLayout.width, canvasLayout.height));
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
    handlesPath.moveTo(cx, cy + hl); handlesPath.lineTo(cx, cy); handlesPath.lineTo(cx + hl, cy);
    handlesPath.moveTo(cx + cw - hl, cy); handlesPath.lineTo(cx + cw, cy); handlesPath.lineTo(cx + cw, cy + hl);
    handlesPath.moveTo(cx, cy + ch - hl); handlesPath.lineTo(cx, cy + ch); handlesPath.lineTo(cx + hl, cy + ch);
    handlesPath.moveTo(cx + cw - hl, cy + ch); handlesPath.lineTo(cx + cw, cy + ch); handlesPath.lineTo(cx + cw, cy + ch - hl);
  }

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer} onLayout={onLayout} {...panResponder.panHandlers}>
        {canvasLayout.height > 0 && (
          <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }} pointerEvents="none">
            <Image
              image={image}
              x={xOffset}
              y={yOffset}
              width={drawWidth}
              height={drawHeight}
              fit="contain"
            />
            {cropRect && (
              <>
                <Path path={overlayPath} color="rgba(0, 0, 0, 0.6)" />
                <Path path={gridPath} color="rgba(255, 255, 255, 0.5)" style="stroke" strokeWidth={1} />
                <Path path={handlesPath} color="white" style="stroke" strokeWidth={4} strokeJoin="round" strokeCap="round" />
              </>
            )}
          </Canvas>
        )}
      </View>
      
      {/* Apple Style Toolbar */}
      <View style={styles.ratioListContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratioList}>
          {RATIOS.map(ratio => (
            <TouchableOpacity key={ratio} onPress={() => setActiveRatio(ratio)}>
              <Text style={[styles.ratioText, activeRatio === ratio && styles.activeRatioText]}>
                {ratio}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* NEW: Aspect Ratio Orientation & Lock Toggles (From Video 1:04) */}
      <View style={styles.orientationToolbar}>
        <View style={styles.orientationToggles}>
          <TouchableOpacity style={styles.orientationBtn}>
            <View style={styles.rectPortrait} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.orientationBtn, styles.activeOrientationBtn]}>
            <View style={styles.rectLandscape} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.lockBtn}>
          <Text style={styles.lockIcon}>🔓</Text>
        </TouchableOpacity>
      </View>
      <RulerDial value={rotation} onChange={setRotation} />
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
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  valueText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dialContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  dialTicks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
  },
  tick: {
    width: 1,
    backgroundColor: '#555',
    marginHorizontal: 3,
  },
  tickMinor: {
    height: 10,
  },
  tickMajor: {
    height: 16,
    backgroundColor: '#888',
  },
  tickCenter: {
    height: 24,
    backgroundColor: '#FFD60A',
    width: 2,
  },
});
