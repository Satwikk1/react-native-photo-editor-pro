import React, { useRef } from 'react';
import { StyleSheet, View, Dimensions, PanResponder } from 'react-native';
import { Canvas, Image, SkImage, Group } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EDITOR_HEIGHT = SCREEN_HEIGHT * 0.7;

interface CropperProps {
  image: SkImage;
  scale: number;
  setScale: (val: number) => void;
  translateX: number;
  setTranslateX: (val: number) => void;
  translateY: number;
  setTranslateY: (val: number) => void;
}

export const Cropper = ({ 
  image, 
  scale, setScale, 
  translateX, setTranslateX, 
  translateY, setTranslateY 
}: CropperProps) => {
  
  const lastPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        lastPos.current = { x: locationX, y: locationY };
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.numberActiveTouches === 1) {
          // Panning
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX - lastPos.current.x;
          const dy = locationY - lastPos.current.y;
          
          setTranslateX(translateX + dx);
          setTranslateY(translateY + dy);
          
          lastPos.current = { x: locationX, y: locationY };
        } else if (gestureState.numberActiveTouches === 2) {
          // Simplified Zoom (Scale by vertical movement)
          const sensitivity = 0.01;
          const newScale = Math.max(0.5, Math.min(5, scale - gestureState.dy * sensitivity));
          setScale(newScale);
        }
      },
    })
  ).current;

  const imgWidth = SCREEN_WIDTH;
  const imgHeight = SCREEN_WIDTH * (image.height() / image.width());

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Group transform={[
          { translateX },
          { translateY },
          { scale },
        ]}>
          <Image
            image={image}
            x={0}
            y={(EDITOR_HEIGHT - imgHeight) / 2}
            width={imgWidth}
            height={imgHeight}
            fit="contain"
          />
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: EDITOR_HEIGHT,
  },
});
