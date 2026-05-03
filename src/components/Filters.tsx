import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Text, ScrollView, LayoutChangeEvent } from 'react-native';
import { Canvas, Image, ColorMatrix, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { EditorStateManager } from '../state/EditorStateManager';
import { FilterThumbnail } from './FilterThumbnail';
import { RulerDial } from './RulerDial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterProps {
  stateManager: EditorStateManager;
}

const FILTERS = [
  { name: 'ORIGINAL', b: 1.0, c: 1.0, s: 1.0 },
  { name: 'VIVID', b: 1.1, c: 1.2, s: 1.4 },
  { name: 'VIVID WARM', b: 1.15, c: 1.2, s: 1.5 },
  { name: 'VIVID COOL', b: 1.05, c: 1.2, s: 1.3 },
  { name: 'DRAMATIC', b: 0.9, c: 1.3, s: 0.8 },
  { name: 'MONO', b: 1.0, c: 1.1, s: 0.0 },
  { name: 'SILVERTONE', b: 1.1, c: 1.0, s: 0.0 },
  { name: 'NOIR', b: 0.8, c: 1.5, s: 0.0 },
];

export const Filters = ({ stateManager }: FilterProps) => {
  const { brightness, contrast, saturation, flipX, rotation, originalImage: image } = stateManager;
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
    setIntensity(100);
    
    const f = FILTERS[index];
    brightness.value = f.b;
    contrast.value = f.c;
    saturation.value = f.s;
  };

  const matrix = useDerivedValue(() => {
    const targetFilter = FILTERS[activeFilterIndex];
    const factor = intensity / 100;
    
    const b = 1 + (targetFilter.b - 1) * factor + (brightness.value - targetFilter.b);
    const c = 1 + (targetFilter.c - 1) * factor + (contrast.value - targetFilter.c);
    const s = 1 + (targetFilter.s - 1) * factor + (saturation.value - targetFilter.s);
    
    const t = (1 - c) / 2;
    const lumR = 0.213, lumG = 0.715, lumB = 0.072;
    
    return [
      c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t*255 + (b-1)*255,
      0                       , 0                       , 0                       , 1, 0,
    ];
  });

  const transform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
    { scaleX: flipX.value }
  ]);

  const drawWidth = canvasLayout.width;
  const drawHeight = canvasLayout.width * (image.height() / image.width());
  const xOffset = 0;
  const yOffset = (canvasLayout.height - drawHeight) / 2;

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

      <View style={styles.controls}>
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

        <View style={styles.dialWrapper}>
          <RulerDial 
            value={intensity} 
            min={0}
            max={100}
            onChange={setIntensity} 
          />
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
    height: 180,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  filterListContainer: {
    height: 100,
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
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
});
