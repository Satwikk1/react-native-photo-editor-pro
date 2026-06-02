import { Vibration, Platform } from 'react-native';

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

export const triggerHaptic = (
  type: HapticTickType,
  enableVibration: boolean = true,
  vibrationType: VibrationType = VibrationType.DEFAULT,
  onTriggerHaptic?: (type: HapticTickType) => void
) => {
  if (!enableVibration) return;
  if (vibrationType === VibrationType.NONE) return;

  if (onTriggerHaptic) {
    try {
      onTriggerHaptic(type);
    } catch (_) {}
    return;
  }

  // On iOS, standard Vibration.vibrate() does not support custom durations and
  // always triggers a 400ms buzz. To avoid constant heavy vibration when scrolling
  // the dial, we only trigger vibration for the main neutral tick on iOS.
  if (Platform.OS === 'ios' && type !== HapticTickType.NEUTRAL) {
    return;
  }

  // Custom durations (in ms) tailored for Haptic tick strengths on Android
  let duration = 0;
  switch (vibrationType) {
    case VibrationType.LIGHT:
      duration = type === HapticTickType.NEUTRAL ? 8 : (type === HapticTickType.MAJOR ? 4 : 1);
      break;
    case VibrationType.MEDIUM:
      duration = type === HapticTickType.NEUTRAL ? 15 : (type === HapticTickType.MAJOR ? 8 : 3);
      break;
    case VibrationType.HEAVY:
      duration = type === HapticTickType.NEUTRAL ? 30 : (type === HapticTickType.MAJOR ? 18 : 6);
      break;
    case VibrationType.DEFAULT:
    default:
      duration = type === HapticTickType.NEUTRAL ? 12 : (type === HapticTickType.MAJOR ? 6 : 2);
      break;
  }

  try {
    Vibration.vibrate(duration);
  } catch (_) {}
};
