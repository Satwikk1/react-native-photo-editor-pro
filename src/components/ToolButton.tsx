import React from 'react';
import { TouchableOpacity, StyleSheet, View, TextInput } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedProps, useDerivedValue, SharedValue } from 'react-native-reanimated';
import { SkiaIcon, IconName } from './SkiaIcon';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const CircularProgress = ({ value, max }: { value: SharedValue<number>; max: number }) => {
  const size = 44;
  const strokeWidth = 2;
  
  const path = useDerivedValue(() => {
    const skPath = Skia.Path.Make();
    const percentage = value.value / max;
    if (percentage === 0) return skPath;
    skPath.addArc(
      { x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth },
      270,
      360 * Math.min(Math.max(percentage, -1), 1)
    );
    return skPath;
  });

  return (
    <View style={styles.canvasOverlay} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        <Path path={path} style="stroke" strokeWidth={strokeWidth} color="#FFD60A" strokeCap="round" />
      </Canvas>
    </View>
  );
};

interface ToolButtonProps {
  icon: IconName;
  isActive: boolean;
  toolValue: SharedValue<number>;
  onPress: () => void;
  max?: number;
}

export const ToolButton = ({
  icon,
  isActive,
  toolValue,
  onPress,
  max = 100,
}: ToolButtonProps) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(toolValue.value)}`,
    } as any;
  });

  const hasValue = useDerivedValue(() => toolValue.value !== 0);
  const iconColor = isActive || hasValue.value ? "#FFD60A" : "#8E8E93";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.adjustBtn,
        isActive && styles.activeBtn,
      ]}
    >
      <CircularProgress value={toolValue} max={max} />
      
      {isActive ? (
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          value={`${Math.round(toolValue.value)}`}
          style={styles.activeValueText}
          animatedProps={animatedProps}
        />
      ) : (
        <SkiaIcon name={icon} color={iconColor} size={22} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  activeBtn: {
    backgroundColor: '#000',
  },
  canvasOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
  },
  activeValueText: {
    color: '#FFD60A',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: 40,
    padding: 0,
    margin: 0,
  },
});
