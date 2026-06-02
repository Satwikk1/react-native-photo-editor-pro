// src/components/Toast.tsx
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export const Toast = ({ message, onDismiss, duration = 3000 }: ToastProps) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    // Smooth entrance, stay visible, then fade out and notify parent
    opacity.value = withSequence(
      withTiming(1, { duration: 350 }),
      withDelay(
        duration - 700,
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        })
      )
    );

    translateY.value = withSequence(
      withTiming(0, { duration: 350 }),
      withDelay(
        duration - 700,
        withTiming(30, { duration: 350 })
      )
    );
  }, [message, duration, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.toastContainer, animatedStyle]}>
      <View style={styles.content}>
        <Text style={styles.toastIcon}>⚠️</Text>
        <Text style={styles.toastText} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 120, // Sit nicely above the editor tab bar
    left: 20,
    right: 20,
    backgroundColor: "#1E1E24", // Premium dark grey/black
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444", // Bright neon-red accent
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6.68,
    elevation: 11,
    zIndex: 9999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  toastText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
});
