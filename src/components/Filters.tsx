import React, { useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text, PanResponder, LayoutChangeEvent, ScrollView, TouchableOpacity } from 'react-native';
import { Canvas, Image, SkImage, ColorMatrix } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterProps {
  image: SkImage;
  brightness: number;
  setBrightness: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  saturation: number;
  setSaturation: (val: number) => void;
}

const FILTERS = [
  { name: 'ORIGINAL', b: 1.0, c: 1.0, s: 1.0 },
  { name: 'VIVID', b: 1.1, c: 1.2, s: 1.4 },
  { name: 'VIVID WARM', b: 1.15, c: 1.2, s: 1.5 }, // Simulated
  { name: 'VIVID COOL', b: 1.05, c: 1.2, s: 1.3 }, // Simulated
  { name: 'DRAMATIC', b: 0.9, c: 1.3, s: 0.8 },
  { name: 'MONO', b: 1.0, c: 1.1, s: 0.0 },
  { name: 'SILVERTONE', b: 1.1, c: 1.0, s: 0.0 },
  { name: 'NOIR', b: 0.8, c: 1.5, s: 0.0 },
];

const FilterThumbnail = ({ image, filter, isActive, onPress }: any) => {
  const b = filter.b;
  const c = filter.c;
  const s = filter.s;
  const t = (1 - c) / 2;
  const lumR = 0.213, lumG = 0.715, lumB = 0.072;
  
  const matrix = [
    c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t*255 + (b-1)*255,
    0                       , 0                       , 0                       , 1, 0,
  ];

  return (
    <TouchableOpacity onPress={onPress} style={styles.thumbnailWrapper}>
      <View style={[styles.thumbnailContainer, isActive && styles.activeThumbnail]}>
        <Canvas style={styles.thumbnailCanvas}>
          <Image image={image} x={0} y={0} width={60} height={80} fit="cover">
            <ColorMatrix matrix={matrix} />
          </Image>
        </Canvas>
      </View>
    </TouchableOpacity>
  );
};

const RulerDial = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const startValue = useRef(value);
  // A fake ruler dial that looks like Apple's intensity slider
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startValue.current = value;
    },
    onPanResponderMove: (_, gestureState) => {
      // Sensitive dial mapping
      const delta = gestureState.dx * 0.5;
      let newVal = startValue.current + delta;
      // Clamp between 0 and 100 for intensity
      newVal = Math.max(0, Math.min(100, newVal));
      onChange(newVal);
    },
  })).current;

  return (
    <View style={styles.dialContainer} {...panResponder.panHandlers}>
      <View style={styles.dialDot} />
      <View style={styles.dialTicks}>
        {Array.from({ length: 41 }).map((_, i) => (
          <View key={i} style={[styles.tick, i % 5 === 0 ? styles.tickMajor : styles.tickMinor, i === 20 && styles.tickCenter]} />
        ))}
      </View>
      <View style={styles.dialDotBottom} />
    </View>
  );
};

export const Filters = ({ 
  image, 
  brightness, setBrightness, 
  contrast, setContrast, 
  saturation, setSaturation 
}: FilterProps) => {
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH, height: 400 });
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [intensity, setIntensity] = useState(100);

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvasLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const handleFilterSelect = (index: number) => {
    setActiveFilterIndex(index);
    setIntensity(100); // Reset intensity to 100 when changing filters
    
    // Apply the base filter settings immediately
    const f = FILTERS[index];
    setBrightness(f.b);
    setContrast(f.c);
    setSaturation(f.s);
  };

  // The actual applied values interpolate between ORIGINAL (b=1, c=1, s=1) and the target filter based on intensity (0-100)
  const targetFilter = FILTERS[activeFilterIndex];
  const factor = intensity / 100;
  
  const b = 1 + (targetFilter.b - 1) * factor;
  const c = 1 + (targetFilter.c - 1) * factor;
  const s = 1 + (targetFilter.s - 1) * factor;

  const t = (1 - c) / 2;
  const lumR = 0.213, lumG = 0.715, lumB = 0.072;
  
  const matrix = [
    c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t*255 + (b-1)*255,
    0                       , 0                       , 0                       , 1, 0,
  ];

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

  const ADJUST_TOOLS = [
    { name: 'AUTO', icon: '🪄' },
    { name: 'EXPOSURE', icon: '±' },
    { name: 'BRILLIANCE', icon: '☼' },
    { name: 'HIGHLIGHTS', icon: '◑' },
    { name: 'SHADOWS', icon: '◐' },
    { name: 'CONTRAST', icon: '◑' },
    { name: 'BRIGHTNESS', icon: '☀' },
  ];

  const [activeAdjustTool, setActiveAdjustTool] = useState('BRILLIANCE');
  const [adjustMode, setAdjustMode] = useState(false); 

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer} onLayout={onLayout}>
        {canvasLayout.height > 0 && (
          <Canvas style={{ width: canvasLayout.width, height: canvasLayout.height }}>
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
          </Canvas>
        )}
      </View>

      <View style={styles.controls}>
        {adjustMode ? (
          <View style={styles.adjustToolsContainer}>
            <Text style={styles.activeAdjustTitle}>{activeAdjustTool}</Text>
            <View style={styles.adjustToolsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adjustScroll}>
                {ADJUST_TOOLS.map((tool) => {
                  const isActive = activeAdjustTool === tool.name;
                  const hasValue = tool.name === 'BRILLIANCE' || tool.name === 'HIGHLIGHTS';
                  
                  return (
                    <TouchableOpacity 
                      key={tool.name} 
                      onPress={() => setActiveAdjustTool(tool.name)}
                      style={[styles.adjustBtn, isActive && styles.activeAdjustBtn, hasValue && styles.hasValueBtn]}
                    >
                      <Text style={[styles.adjustIcon, isActive && styles.activeAdjustIcon, hasValue && styles.hasValueIcon]}>{tool.icon}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={styles.filterListContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
              {FILTERS.map((f, i) => (
                <View key={f.name} style={styles.filterItemWrapper}>
                  <FilterThumbnail 
                    image={image}
                    filter={f}
                    isActive={activeFilterIndex === i}
                    onPress={() => handleFilterSelect(i)}
                  />
                  <Text style={[styles.filterName, activeFilterIndex === i && styles.activeFilterName]}>{f.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.dialWrapper}>
          <RulerDial value={intensity} onChange={setIntensity} />
          
          <TouchableOpacity 
            style={styles.modeToggleBtn} 
            onPress={() => setAdjustMode(!adjustMode)}
          >
            <Text style={styles.modeToggleText}>{adjustMode ? 'FILTERS' : 'ADJUST'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    height: 220,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  filterListContainer: {
    height: 120,
  },
  filterList: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 15,
  },
  filterItemWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  filterName: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  activeFilterName: {
    color: '#FFD60A',
  },
  thumbnailWrapper: {
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#FFD60A',
  },
  thumbnailCanvas: {
    width: 60,
    height: 80,
  },
  adjustToolsContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAdjustTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 15,
  },
  adjustToolsRow: {
    width: SCREEN_WIDTH,
  },
  adjustScroll: {
    paddingHorizontal: 20,
    gap: 20,
    alignItems: 'center',
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeAdjustBtn: {
    borderColor: '#FFD60A',
  },
  hasValueBtn: {
    borderColor: '#FFF',
  },
  adjustIcon: {
    fontSize: 20,
    color: '#8E8E93',
  },
  activeAdjustIcon: {
    color: '#FFD60A',
  },
  hasValueIcon: {
    color: '#FFF',
  },
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    position: 'relative',
  },
  dialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  dialDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD60A',
    position: 'absolute',
    top: -10,
    left: SCREEN_WIDTH / 2 - 3,
  },
  dialDotBottom: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD60A',
    position: 'absolute',
    bottom: -10,
    left: SCREEN_WIDTH / 2 - 3,
  },
  modeToggleBtn: {
    position: 'absolute',
    left: 20,
    bottom: 25,
  },
  modeToggleText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
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
