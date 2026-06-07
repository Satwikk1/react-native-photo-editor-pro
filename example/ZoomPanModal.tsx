import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface ZoomPanModalProps {
  visible: boolean;
  imageUri: string | number | null;
  onClose: () => void;
}

export const ZoomPanModal = ({ visible, imageUri, onClose }: ZoomPanModalProps) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const [currentZoom, setCurrentZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Store initial gesture values
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);
  const initialTouch = useRef<{ x: number; y: number } | null>(null);
  const initialPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTap = useRef<number>(0);

  // Synchronize Reanimated scale back to JS state for text readout
  const updateZoomText = (val: number) => {
    setCurrentZoom(val);
  };

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      setCurrentZoom(1);
      setIsLoading(true);
    }
  }, [visible, imageUri]);

  const getDistance = (touches: any[]) => {
    const [t1, t2] = touches;
    return Math.sqrt(
      Math.pow(t1.pageX - t2.pageX, 2) + Math.pow(t1.pageY - t2.pageY, 2)
    );
  };

  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    setCurrentZoom(1);
  };

  const handleZoomIn = () => {
    const nextScale = Math.min(5, scale.value + 0.5);
    scale.value = withSpring(nextScale);
    setCurrentZoom(nextScale);
  };

  const handleZoomOut = () => {
    const nextScale = Math.max(1, scale.value - 0.5);
    scale.value = withSpring(nextScale);
    setCurrentZoom(nextScale);
    if (nextScale <= 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        
        // Double-tap handler to toggle zoom
        const now = Date.now();
        if (touches.length === 1 && now - lastTap.current < 300) {
          if (scale.value > 1.1) {
            resetZoom();
          } else {
            scale.value = withSpring(2.5);
            setCurrentZoom(2.5);
          }
          lastTap.current = 0; // Reset
          return;
        }
        if (touches.length === 1) {
          lastTap.current = now;
        }

        if (touches.length === 2) {
          // Initialize Pinch
          initialDistance.current = getDistance(touches);
          initialScale.current = scale.value;
        } else if (touches.length === 1) {
          // Initialize Pan
          initialTouch.current = { x: touches[0].pageX, y: touches[0].pageY };
          initialPan.current = { x: translateX.value, y: translateY.value };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        
        if (touches.length === 2 && initialDistance.current !== null) {
          // Handle Pinch Zoom
          const currentDistance = getDistance(touches);
          const nextScale = initialScale.current * (currentDistance / initialDistance.current);
          const clamped = Math.max(1, Math.min(5, nextScale));
          scale.value = clamped;
          runOnJS(updateZoomText)(clamped);
        } else if (touches.length === 1 && initialTouch.current !== null) {
          // Handle Pan
          if (scale.value > 1.05) {
            const dx = touches[0].pageX - initialTouch.current.x;
            const dy = touches[0].pageY - initialTouch.current.y;

            // Boundary calculations
            const screenWidth = Dimensions.get("window").width;
            const screenHeight = Dimensions.get("window").height;
            const maxDx = (screenWidth * (scale.value - 1)) / 2;
            const maxDy = (screenHeight * (scale.value - 1)) / 2;

            translateX.value = Math.max(-maxDx, Math.min(maxDx, initialPan.current.x + dx));
            translateY.value = Math.max(-maxDy, Math.min(maxDy, initialPan.current.y + dy));
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = null;
        initialTouch.current = null;

        // If zoom is returned to base size, snap coordinates back to origin
        if (scale.value <= 1.05) {
          scale.value = withSpring(1);
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          runOnJS(updateZoomText)(1);
        }
      },
      onPanResponderTerminate: () => {
        initialDistance.current = null;
        initialTouch.current = null;
      },
    })
  ).current;

  // Animated styles applied to the image view
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const imageSource = typeof imageUri === "number" ? imageUri : { uri: imageUri as string };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header Row */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>

            <View style={styles.zoomBadge}>
              <Text style={styles.zoomBadgeText}>
                {currentZoom.toFixed(1)}x
              </Text>
            </View>
          </View>

          {/* Main Zoom Area */}
          <View style={styles.gestureContainer} {...panResponder.panHandlers}>
            {imageUri && (
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                  source={imageSource}
                  style={styles.zoomedImage}
                  resizeMode="contain"
                  onLoadEnd={() => setIsLoading(false)}
                />
              </Animated.View>
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD60A" />
              </View>
            )}
          </View>

          {/* Action Overlay Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleZoomOut}
                disabled={currentZoom <= 1.0}
                activeOpacity={0.6}
              >
                <Text style={[styles.controlBtnText, currentZoom <= 1.0 && styles.disabledText]}>
                  －
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={resetZoom}
                disabled={currentZoom === 1.0}
                activeOpacity={0.6}
              >
                <Text style={[styles.resetBtnText, currentZoom === 1.0 && styles.disabledText]}>
                  Reset View
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleZoomIn}
                disabled={currentZoom >= 5.0}
                activeOpacity={0.6}
              >
                <Text style={[styles.controlBtnText, currentZoom >= 5.0 && styles.disabledText]}>
                  ＋
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              Pinch image or double-tap to zoom. Drag to pan around.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: "#08080C",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  zoomBadge: {
    backgroundColor: "rgba(255, 214, 10, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 10, 0.3)",
  },
  zoomBadgeText: {
    color: "#FFD60A",
    fontSize: 12,
    fontWeight: "800",
  },
  gestureContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomedImage: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    alignSelf: "center",
  },
  toolbar: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 20, 28, 0.8)",
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  controlBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  resetBtn: {
    paddingHorizontal: 20,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnText: {
    color: "#FFD60A",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledText: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
