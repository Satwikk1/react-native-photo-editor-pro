import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Text,
} from "react-native";
import {
  Canvas,
  Image,
  SkImage,
  SkPath,
  Skia,
  Path,
  Group,
} from "@shopify/react-native-skia";

import { EditorStateManager } from "../state/EditorStateManager";
import { useDerivedValue } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EDITOR_HEIGHT = SCREEN_HEIGHT * 0.7;

interface DrawingBoardProps {
  stateManager: EditorStateManager;
  onCancel: () => void;
  onDone: () => void;
}

const COLORS = [
  "#FFFFFF", // White
  "#000000", // Black
  "#FF3B30", // Red
  "#FF9500", // Orange
  "#FFCC00", // Yellow
  "#4CD964", // Green
  "#5AC8FA", // Light Blue
  "#007AFF", // Blue
  "#5856D6", // Purple
];

export const DrawingBoard = ({
  stateManager,
  onCancel,
  onDone,
}: DrawingBoardProps) => {
  const {
    paths: managerPaths,
    flipX: managerFlipX,
    rotation: managerRotation,
    originalImage: image,
  } = stateManager;
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

  useEffect(() => {
    setPaths(managerPaths.value);
  }, []);

  const [activeColor, setActiveColor] = useState(COLORS[2]); // Default Red
  const activeColorRef = useRef(COLORS[2]);

  const [strokeWidth, setStrokeWidth] = useState(4);
  const strokeWidthRef = useRef(4);

  // Sync refs so pan responder can access them
  activeColorRef.current = activeColor;
  strokeWidthRef.current = strokeWidth;

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
          setCurrentPath(currentPathRef.current.copy());
        }
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setPaths((prev) => [
            ...prev,
            {
              path: currentPathRef.current!,
              color: activeColorRef.current,
              width: strokeWidthRef.current,
            },
          ]);
          currentPathRef.current = null;
          setCurrentPath(null);
        }
      },
    }),
  ).current;

  const imgWidth = SCREEN_WIDTH;
  const ACTUAL_EDITOR_HEIGHT = SCREEN_HEIGHT - 160; // Leave space for toolDock
  const imgHeight = SCREEN_WIDTH * (image.height() / image.width());

  const transform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
    { scaleX: flipX.value },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.canvasWrapper} {...panResponder.panHandlers}>
        <Canvas
          style={{ width: SCREEN_WIDTH, height: ACTUAL_EDITOR_HEIGHT }}
          pointerEvents="none"
        >
          <Group
            origin={{
              x: imgWidth / 2,
              y: (ACTUAL_EDITOR_HEIGHT - imgHeight) / 2 + imgHeight / 2,
            }}
            transform={transform}
          >
            <Image
              image={image}
              x={0}
              y={(ACTUAL_EDITOR_HEIGHT - imgHeight) / 2}
              width={imgWidth}
              height={imgHeight}
              fit="contain"
            />
          </Group>
          {paths.map((p, index) => (
            <Path
              key={index}
              path={p.path}
              style="stroke"
              strokeWidth={p.width}
              color={p.color}
            />
          ))}
          {currentPath && (
            <Path
              path={currentPath}
              style="stroke"
              strokeWidth={strokeWidth}
              color={activeColor}
            />
          )}
        </Canvas>
      </View>

      <View style={styles.toolDock}>
        <View style={styles.strokeSelector}>
          <TouchableOpacity
            onPress={() => setStrokeWidth(2)}
            style={styles.strokeBtn}
          >
            <View
              style={[
                styles.strokeDot,
                {
                  width: 4,
                  height: 4,
                  backgroundColor: strokeWidth === 2 ? "#FFD60A" : "#FFF",
                },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStrokeWidth(4)}
            style={styles.strokeBtn}
          >
            <View
              style={[
                styles.strokeDot,
                {
                  width: 8,
                  height: 8,
                  backgroundColor: strokeWidth === 4 ? "#FFD60A" : "#FFF",
                },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStrokeWidth(8)}
            style={styles.strokeBtn}
          >
            <View
              style={[
                styles.strokeDot,
                {
                  width: 14,
                  height: 14,
                  backgroundColor: strokeWidth === 8 ? "#FFD60A" : "#FFF",
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.colorStrip}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setActiveColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                activeColor === c && styles.activeColorSwatch,
              ]}
            />
          ))}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={onCancel} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              managerPaths.value = paths;
              onDone();
            }}
            style={[styles.actionBtn, styles.actionBtnDone]}
          >
            <Text style={styles.actionBtnTextDone}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  canvasWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: EDITOR_HEIGHT,
  },
  toolDock: {
    height: 180,
    backgroundColor: "#1C1C1E",
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
  },
  strokeSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    width: 150,
    justifyContent: "space-around",
  },
  strokeBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  strokeDot: {
    borderRadius: 15,
  },
  colorStrip: {
    flexDirection: "row",
    width: SCREEN_WIDTH - 32,
    justifyContent: "space-between",
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#333",
  },
  activeColorSwatch: {
    borderColor: "#FFF",
    transform: [{ scale: 1.1 }],
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: SCREEN_WIDTH - 40,
    marginTop: 20,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#2C2C2E",
  },
  actionBtnDone: {
    backgroundColor: "#FFD60A",
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  actionBtnTextDone: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
