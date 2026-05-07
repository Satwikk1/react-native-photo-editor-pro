import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { 
  Canvas, 
  Circle, 
} from '@shopify/react-native-skia';
import { SkiaIcon, IconName } from './SkiaIcon';

interface TabButtonProps {
  id: "adjust" | "filter" | "crop";
  label: string;
  icon: IconName;
  activeTab: string;
  onPress: (id: "adjust" | "filter" | "crop") => void;
  theme?: {
    primary?: string;
    background?: string;
    text?: string;
  };
}

const DEFAULT_THEME_COLOR = '#FFD60A';
const INACTIVE_COLOR = '#8E8E93';

export const TabButton = ({ id, label, icon, activeTab, onPress, theme }: TabButtonProps) => {
  const isActive = activeTab === id;
  const primaryColor = theme?.primary || DEFAULT_THEME_COLOR;
  
  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={localStyles.tab} 
      onPress={() => onPress(id)}
    >
      <View style={localStyles.iconContainer}>
        <Canvas style={localStyles.bgCanvas} pointerEvents="none">
          {isActive && (
            <Circle
              cx={20}
              cy={20}
              r={18}
              color={primaryColor}
              opacity={0.15}
            />
          )}
        </Canvas>
        <View style={localStyles.tabIconWrapper}>
          <SkiaIcon 
            name={icon} 
            color={isActive ? '#FFFFFF' : INACTIVE_COLOR} 
            size={24} 
          />
        </View>
      </View>
      
      <Text style={[
        localStyles.tabText, 
        { color: isActive ? '#FFFFFF' : INACTIVE_COLOR }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const localStyles = StyleSheet.create({
  tab: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
  },
  tabIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});