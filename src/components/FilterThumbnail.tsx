import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Canvas, Image, ColorMatrix, SkImage } from '@shopify/react-native-skia';

interface FilterThumbnailProps {
  image: SkImage;
  filter: { name: string, b: number, c: number, s: number };
  isActive: boolean;
  onPress: () => void;
}

export const FilterThumbnail = ({ image, filter, isActive, onPress }: FilterThumbnailProps) => {
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

const styles = StyleSheet.create({
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
});
