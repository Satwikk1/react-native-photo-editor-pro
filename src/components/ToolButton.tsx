import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, TextInput } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedProps, useDerivedValue, SharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { SkiaIcon, IconName } from './SkiaIcon';
import { addAlpha } from '../utils/convert';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const CircularProgress = ({ value, max, color }: { value: SharedValue<number>; max: number; color: string }) => {
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
      <Canvas style={{ flex: 1 }} pointerEvents="none">
        <Path path={path} style="stroke" strokeWidth={strokeWidth} color={color} strokeCap="round" />
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
  primaryColor?: string;
  id?: string;
  label?: string;
  theme?: {
    primary?: string;
    background?: string;
    text?: string;
    sliderActive?: string;
    iconActive?: string;
    iconInactive?: string;
    toolButtonActiveBg?: string;
    toolButtonInactiveBg?: string;
  };
}

export const ToolButton = ({
  icon,
  isActive,
  toolValue,
  onPress,
  max = 100,
  primaryColor = "#FFD60A",
  theme,
}: ToolButtonProps) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(toolValue.value)}`,
    } as any;
  });

  const textColor = theme?.text || "#FFF";
  const activeBtnBg = theme?.toolButtonActiveBg ?? (theme?.background ? theme.background : "#000");
  const inactiveBtnBg = theme?.toolButtonInactiveBg ?? (theme?.text ? addAlpha(theme.text, "1A") : "#1C1C1E");

  const [showProgress, setShowProgress] = useState(toolValue.value !== 0);

  useEffect(() => {
    setShowProgress(toolValue.value !== 0);
  }, [toolValue]);

  useAnimatedReaction(
    () => toolValue.value !== 0,
    (hasVal, prevHasVal) => {
      if (hasVal !== prevHasVal) {
        runOnJS(setShowProgress)(hasVal);
      }
    }
  );

  const hasValue = useDerivedValue(() => toolValue.value !== 0);
  const activeIconColor = theme?.iconActive ?? theme?.primary ?? primaryColor;
  const inactiveIconColor = theme?.iconInactive ?? (theme?.text ? addAlpha(theme.text, "80") : "#8E8E93");
  const iconColor = isActive || hasValue.value ? activeIconColor : inactiveIconColor;

  const progressColor = theme?.sliderActive ?? theme?.primary ?? primaryColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.adjustBtn,
        { backgroundColor: inactiveBtnBg },
        isActive && { backgroundColor: activeBtnBg },
      ]}
    >
      {showProgress && <CircularProgress value={toolValue} max={max} color={progressColor} />}
      
      {isActive ? (
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          value={`${Math.round(toolValue.value)}`}
          style={[styles.activeValueText, { color: textColor }]}
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  canvasOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
  },
  activeValueText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: 40,
    padding: 0,
    margin: 0,
  },
});
