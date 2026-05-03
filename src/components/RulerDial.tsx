import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, PanResponder } from 'react-native';
import { Canvas, Rect, Group } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICK_SPACING = 20;
const TICK_COUNT = 81; 
const CENTER_INDEX = 40;

interface RulerDialProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  activeColor?: string;
}

export const RulerDial = ({ 
  value, 
  onChange, 
  min = -100, 
  max = 100, 
  activeColor = '#FFD60A' 
}: RulerDialProps) => {
  const scrollX = useSharedValue(0);
  const startScrollX = useSharedValue(0);
  const isInteracting = useRef(false);

  const range = max - min;
  const totalRulerWidth = (TICK_COUNT - 1) * TICK_SPACING;
  const pixelsPerUnit = totalRulerWidth / range;

  // Sync internal scroll position with external value prop when not interacting
  useEffect(() => {
    if (!isInteracting.current) {
      const centerValue = (max + min) / 2;
      scrollX.value = -(value - centerValue) * pixelsPerUnit;
    }
  }, [value, min, max, pixelsPerUnit]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isInteracting.current = true;
        startScrollX.value = scrollX.value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newScrollX = startScrollX.value + gestureState.dx;
        const maxScroll = totalRulerWidth / 2;
        scrollX.value = Math.max(-maxScroll, Math.min(maxScroll, newScrollX));

        const centerValue = (max + min) / 2;
        const newVal = centerValue - (scrollX.value / pixelsPerUnit);
        onChange(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        isInteracting.current = false;
        
        let velocity = gestureState.vx;
        const friction = 0.94; // More friction for better control
        const maxScroll = totalRulerWidth / 2;

        const momentumStep = () => {
          if (isInteracting.current || Math.abs(velocity) < 0.01) return;

          const delta = velocity * 16; // Standard frame velocity
          const newScrollX = scrollX.value + delta;

          if (newScrollX > maxScroll || newScrollX < -maxScroll) {
            scrollX.value = Math.max(-maxScroll, Math.min(maxScroll, newScrollX));
            velocity = 0;
          } else {
            scrollX.value = newScrollX;
            velocity *= friction;
            
            const centerValue = (max + min) / 2;
            const newVal = centerValue - (scrollX.value / pixelsPerUnit);
            onChange(newVal);
            
            requestAnimationFrame(momentumStep);
          }
        };

        if (Math.abs(velocity) > 0.1) {
          momentumStep();
        }
      },
      onPanResponderTerminate: () => {
        isInteracting.current = false;
      },
    })
  ).current;

  const ticksTransform = useDerivedValue(() => {
    return [{ translateX: scrollX.value }];
  });

  return (
    <View style={styles.dialContainer} {...panResponder.panHandlers}>
      <View style={styles.gestureSurface}>
        <Canvas style={styles.canvas}>
          {/* Ticks Group that moves with pan */}
          <Group transform={ticksTransform}>
            {Array.from({ length: TICK_COUNT }).map((_, i) => {
              const isMajor = i % 5 === 0;
              const isCenter = i === CENTER_INDEX;
              const xPos = (i - CENTER_INDEX) * TICK_SPACING + SCREEN_WIDTH / 2;
              
              return (
                <Rect
                  key={i}
                  x={xPos - (isCenter ? 1 : 0.5)}
                  y={isCenter ? 10 : isMajor ? 15 : 20}
                  width={isCenter ? 2 : 1}
                  height={isCenter ? 35 : isMajor ? 25 : 15}
                  color={isCenter ? activeColor : isMajor ? '#8E8E93' : '#3A3A3C'}
                />
              );
            })}
          </Group>
          
          {/* Fixed Center Indicator Overlay */}
          <Rect 
            x={SCREEN_WIDTH / 2 - 1} 
            y={5} 
            width={2} 
            height={45} 
            color={activeColor} 
          />
        </Canvas>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dialContainer: {
    height: 60,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  gestureSurface: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
