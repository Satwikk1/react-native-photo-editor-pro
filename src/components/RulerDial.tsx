import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Dimensions, PanResponder } from 'react-native';
import { Canvas, Rect, Group } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICK_SPACING = 20;
const TICK_COUNT = 81; 
const VISUAL_CENTER_INDEX = 40; // The middle of the 81 ticks

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

  // Calculate where "0" (Neutral) is on the ruler index
  const neutralIndex = useMemo(() => {
    if (min >= 0) return 0;
    if (max <= 0) return TICK_COUNT - 1;
    // Map 0 to index between 0 and 80
    return Math.round(((0 - min) / range) * (TICK_COUNT - 1));
  }, [min, max, range]);

  // Sync internal scroll position with external value prop
  useEffect(() => {
    if (!isInteracting.current) {
      const valueIndex = ((value - min) / range) * (TICK_COUNT - 1);
      scrollX.value = -(valueIndex - VISUAL_CENTER_INDEX) * TICK_SPACING;
    }
  }, [value, min, max, range]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
        
        // Boundaries: don't let user scroll past min/max values
        const minValIndex = 0;
        const maxValIndex = TICK_COUNT - 1;
        const maxScroll = -(minValIndex - VISUAL_CENTER_INDEX) * TICK_SPACING;
        const minScroll = -(maxValIndex - VISUAL_CENTER_INDEX) * TICK_SPACING;
        
        scrollX.value = Math.max(minScroll, Math.min(maxScroll, newScrollX));

        // Convert scroll back to value
        const valueIndex = VISUAL_CENTER_INDEX - (scrollX.value / TICK_SPACING);
        const newVal = min + (valueIndex / (TICK_COUNT - 1)) * range;
        onChangeRef.current(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        isInteracting.current = false;
        
        let velocity = gestureState.vx;
        const friction = 0.94;
        
        const minValIndex = 0;
        const maxValIndex = TICK_COUNT - 1;
        const maxScroll = -(minValIndex - VISUAL_CENTER_INDEX) * TICK_SPACING;
        const minScroll = -(maxValIndex - VISUAL_CENTER_INDEX) * TICK_SPACING;

        const momentumStep = () => {
          if (isInteracting.current || Math.abs(velocity) < 0.01) return;

          const delta = velocity * 16;
          const newScrollX = scrollX.value + delta;

          if (newScrollX > maxScroll || newScrollX < minScroll) {
            scrollX.value = Math.max(minScroll, Math.min(maxScroll, newScrollX));
            velocity = 0;
          } else {
            scrollX.value = newScrollX;
            velocity *= friction;
            
            const valueIndex = VISUAL_CENTER_INDEX - (scrollX.value / TICK_SPACING);
            const newVal = min + (valueIndex / (TICK_COUNT - 1)) * range;
            onChangeRef.current(newVal);
            
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
        <Canvas style={styles.canvas} pointerEvents="none">
          {/* Ticks Group */}
          <Group transform={ticksTransform}>
            {Array.from({ length: TICK_COUNT }).map((_, i) => {
              const isMajor = i % 5 === 0;
              const isNeutral = i === neutralIndex;
              const xPos = (i - VISUAL_CENTER_INDEX) * TICK_SPACING + SCREEN_WIDTH / 2;
              
              return (
                <Rect
                  key={i}
                  x={xPos - (isNeutral ? 1 : 0.5)}
                  y={isNeutral ? 10 : isMajor ? 15 : 20}
                  width={isNeutral ? 2 : 1}
                  height={isNeutral ? 35 : isMajor ? 25 : 15}
                  color={isNeutral ? activeColor : isMajor ? '#8E8E93' : '#3A3A3C'}
                />
              );
            })}
          </Group>
          
          {/* Fixed Center Indicator (The current value pointer) */}
          <Rect 
            x={SCREEN_WIDTH / 2 - 1} 
            y={5} 
            width={2} 
            height={45} 
            color="#FFF" // Current value pointer is white, Neutral is Yellow
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
