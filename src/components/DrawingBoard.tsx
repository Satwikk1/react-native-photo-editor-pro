import React, { useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, PanResponder } from 'react-native';
import { Canvas, Image, SkImage, SkPath, Skia, Path } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EDITOR_HEIGHT = SCREEN_HEIGHT * 0.7;

interface DrawingBoardProps {
  image: SkImage;
  paths: { path: SkPath; color: string }[];
  setPaths: React.Dispatch<React.SetStateAction<{ path: SkPath; color: string }[]>>;
}

export const DrawingBoard = ({ image, paths, setPaths }: DrawingBoardProps) => {
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const path = Skia.Path.Make();
        path.moveTo(locationX, locationY);
        currentPathRef.current = path;
        setCurrentPath(path);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (currentPathRef.current) {
          currentPathRef.current.lineTo(locationX, locationY);
          // Trigger re-render with a copy
          setCurrentPath(currentPathRef.current.copy());
        }
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setPaths((prev) => [...prev, { path: currentPathRef.current!, color: '#FFFFFF' }]);
          currentPathRef.current = null;
          setCurrentPath(null);
        }
      },
    })
  ).current;

  const imgWidth = SCREEN_WIDTH;
  const imgHeight = SCREEN_WIDTH * (image.height() / image.width());

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Image
          image={image}
          x={0}
          y={(EDITOR_HEIGHT - imgHeight) / 2}
          width={imgWidth}
          height={imgHeight}
          fit="contain"
        />
        {paths.map((p, index) => (
          <Path 
            key={index} 
            path={p.path} 
            style="stroke" 
            strokeWidth={4} 
            color={p.color} 
          />
        ))}
        {currentPath && (
          <Path 
            path={currentPath} 
            style="stroke" 
            strokeWidth={4} 
            color="#FFFFFF" 
          />
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: EDITOR_HEIGHT,
  },
});
