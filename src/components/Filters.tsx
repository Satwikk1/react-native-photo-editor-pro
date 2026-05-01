import React from 'react';
import { StyleSheet, View, Dimensions, Text, PanResponder } from 'react-native';
import { Canvas, Image, SkImage, ColorMatrix } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EDITOR_HEIGHT = SCREEN_HEIGHT * 0.7;

interface FilterProps {
  image: SkImage;
  brightness: number;
  setBrightness: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  saturation: number;
  setSaturation: (val: number) => void;
}

const AdjustmentSlider = ({ label, value, min, max, onChange }: { 
  label: string; 
  value: number; 
  min: number; 
  max: number;
  onChange: (val: number) => void;
}) => {
  const trackWidth = SCREEN_WIDTH - 120;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Calculate new value based on horizontal position
      const percentage = Math.max(0, Math.min(1, gestureState.moveX / SCREEN_WIDTH));
      const newVal = min + percentage * (max - min);
      onChange(newVal);
    },
  });

  const thumbPos = ((value - min) / (max - min)) * trackWidth;

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderTrackContainer} {...panResponder.panHandlers}>
        <View style={styles.sliderTrack} />
        <View style={[styles.sliderThumb, { left: thumbPos }]} />
      </View>
      <Text style={styles.valueText}>{value.toFixed(1)}</Text>
    </View>
  );
};

export const Filters = ({ 
  image, 
  brightness, setBrightness, 
  contrast, setContrast, 
  saturation, setSaturation 
}: FilterProps) => {

  const b = brightness;
  const c = contrast;
  const s = saturation;
  const t = (1 - c) / 2;
  const lumR = 0.213, lumG = 0.715, lumB = 0.072;
  
  const matrix = [
    c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
    c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t*255 + (b-1)*255,
    0                       , 0                       , 0                       , 1, 0,
  ];

  const imgWidth = SCREEN_WIDTH;
  const imgHeight = SCREEN_WIDTH * (image.height() / image.width());

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas}>
          <Image
            image={image}
            x={0}
            y={(EDITOR_HEIGHT - imgHeight) / 2}
            width={imgWidth}
            height={imgHeight}
            fit="contain"
          >
            <ColorMatrix matrix={matrix} />
          </Image>
        </Canvas>
      </View>

      <View style={styles.controls}>
        <AdjustmentSlider label="BRIGHT" value={brightness} min={0.5} max={1.5} onChange={setBrightness} />
        <AdjustmentSlider label="CONTRAST" value={contrast} min={0.5} max={1.5} onChange={setContrast} />
        <AdjustmentSlider label="SATUR" value={saturation} min={0} max={2} onChange={setSaturation} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    height: EDITOR_HEIGHT,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: EDITOR_HEIGHT,
  },
  controls: {
    padding: 20,
    backgroundColor: '#111',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sliderLabel: {
    color: '#999',
    width: 70,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sliderTrackContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    top: 12,
  },
  valueText: {
    color: '#fff',
    width: 30,
    fontSize: 10,
    textAlign: 'right',
  },
});
