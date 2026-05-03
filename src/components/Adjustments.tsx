import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, Text, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Canvas, Image, ColorMatrix, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { EditorStateManager } from '../state/EditorStateManager';
import { RulerDial } from './RulerDial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdjustmentsProps {
  stateManager: EditorStateManager;
}

const ADJUST_TOOLS = [
  { name: 'BRIGHTNESS', icon: '☀' },
  { name: 'CONTRAST', icon: '◑' },
  { name: 'SATURATION', icon: '❂' },
];

export const Adjustments = ({ stateManager }: AdjustmentsProps) => {
  const { brightness, contrast, saturation, flipX, rotation, originalImage: image } = stateManager;
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH, height: 400 });
  const [activeAdjustTool, setActiveAdjustTool] = useState('BRIGHTNESS');

  // Local state for UI display to avoid reading .value during render
  const [brightnessVal, setBrightnessVal] = useState(0);
  const [contrastVal, setContrastVal] = useState(0);
  const [saturationVal, setSaturationVal] = useState(0);

  useEffect(() => {
    setBrightnessVal(Math.round((brightness.value - 1) * 200));
    setContrastVal(Math.round((contrast.value - 1) * 200));
    setSaturationVal(Math.round((saturation.value - 1) * 200));
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvasLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const getToolValue = (toolName: string) => {
    if (toolName === 'BRIGHTNESS') return brightnessVal;
    if (toolName === 'CONTRAST') return contrastVal;
    if (toolName === 'SATURATION') return saturationVal;
    return 0;
  };

  const matrix = useDerivedValue(() => {
    const b = brightness.value;
    const c = contrast.value;
    const s = saturation.value;
    
    const t = (1 - c) / 2;
    const lumR = 0.213, lumG = 0.715, lumB = 0.072;
    
    return [
      c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t + (b-1),
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t + (b-1),
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t + (b-1),
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
        <View style={styles.adjustToolsContainer}>
          <Text style={styles.activeAdjustTitle}>{activeAdjustTool}</Text>
          <View style={styles.adjustToolsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adjustScroll}>
              {ADJUST_TOOLS.map((tool) => {
                const isActive = activeAdjustTool === tool.name;
                const toolValue = getToolValue(tool.name);
                const hasValue = toolValue !== 0;
                
                return (
                  <TouchableOpacity 
                    key={tool.name} 
                    onPress={() => setActiveAdjustTool(tool.name)}
                    style={[
                      styles.adjustBtn, 
                      isActive && styles.activeAdjustBtn, 
                      hasValue && !isActive && styles.hasValueBtn
                    ]}
                  >
                    {isActive && hasValue ? (
                      <Text style={styles.activeValueText}>{toolValue}</Text>
                    ) : (
                      <Text style={[styles.adjustIcon, isActive && styles.activeAdjustIcon, hasValue && !isActive && styles.hasValueIcon]}>{tool.icon}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.dialWrapper}>
          <RulerDial 
            value={
              activeAdjustTool === 'BRIGHTNESS' ? brightnessVal :
              activeAdjustTool === 'CONTRAST' ? contrastVal :
              saturationVal
            } 
            min={-100}
            max={100}
            onChange={(val) => {
              const rounded = Math.round(val);
              const normVal = 1 + (val / 200);
              if (activeAdjustTool === 'BRIGHTNESS') {
                brightness.value = normVal;
                setBrightnessVal(rounded);
              } else if (activeAdjustTool === 'CONTRAST') {
                contrast.value = normVal;
                setContrastVal(rounded);
              } else {
                saturation.value = normVal;
                setSaturationVal(rounded);
              }
            }} 
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
  adjustToolsContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAdjustTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
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
  activeValueText: {
    color: '#FFD60A',
    fontSize: 16,
    fontWeight: '600',
  },
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
});
