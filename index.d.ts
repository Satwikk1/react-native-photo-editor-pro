import { ComponentType } from 'react';
import { SkImage } from '@shopify/react-native-skia';

export interface EditorTheme {
  primary?: string;
  background?: string;
  text?: string;
  tabBarBackground?: string;
  sliderActive?: string;
  sliderInactive?: string;
  rulerBg?: string;
  rulerTickActive?: string;
  rulerTickInactive?: string;
  rulerPointer?: string;
  iconActive?: string;
  iconInactive?: string;
  toolButtonActiveBg?: string;
  toolButtonInactiveBg?: string;
}

export interface FilterConfig {
  id: string;
  name: string;
  matrix?: number[];
  effect?: any;
  category: 'original' | 'analog' | 'cinematic' | 'bw';
}

export enum VibrationType {
  NONE = 'NONE',
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY',
  DEFAULT = 'DEFAULT',
}

export enum HapticTickType {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  NEUTRAL = 'NEUTRAL',
}

export interface PhotoEditorProps {
  uri: string | number;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
  theme?: EditorTheme;
  exportFormat?: 'png' | 'jpeg' | 'webp';
  exportQuality?: number;
  visibleTabs?: ('crop' | 'filter' | 'adjust' | 'draw')[];
  customFilters?: FilterConfig[];
  replaceDefaultFilters?: boolean;
  enableBeforeAfter?: boolean;
  enableReset?: boolean;
  enableVibration?: boolean;
  vibrationType?: VibrationType;
  onTriggerHaptic?: (type: HapticTickType) => void;
}

export declare const PhotoEditor: ComponentType<PhotoEditorProps>;

export declare function isSupportedFormat(uri: string | number): boolean;

export declare function convertSkImage(
  image: SkImage,
  format?: 'png' | 'jpeg' | 'webp',
  quality?: number
): string | null;
