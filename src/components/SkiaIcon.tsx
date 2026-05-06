import React from "react";
import { Canvas, Path, Group } from "@shopify/react-native-skia";

// Each icon is a single SVG path designed to have a *distinct silhouette*
// in its render mode — no shared "outer-circle frame" so they don't all
// collapse into the same blob at small sizes.

export const ICON_PATHS = {
  // Auto — 5-point star (filled).
  AUTO: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",

  // Exposure — adjustable square aperture (stroked diamond + center cross).
  EXPOSURE: "M12 3l9 9-9 9-9-9z M12 8v8 M8 12h8",

  // Brilliance — 4-point sparkle / kite (filled, distinct from AUTO's 5 points).
  BRILLIANCE: "M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z",

  // Highlights — top half-disc (filled, no outer frame).
  HIGHLIGHTS: "M3 12a9 9 0 0118 0z",

  // Shadows — bottom half-disc (filled, no outer frame).
  SHADOWS: "M3 12a9 9 0 0018 0z",

  // Contrast — vertical-half filled D-shape (filled).
  CONTRAST: "M12 3v18a9 9 0 000-18z",

  // Brightness — sun with rays (stroked).
  BRIGHTNESS:
    "M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v3 M12 19v3 M5 12H2 M22 12h-3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1",

  // Black Point — small filled square reference dot (filled, no frame).
  BLACK_POINT: "M8 8h8v8H8z",

  // Saturation — paint drop with horizontal swatch line (stroked).
  SATURATION: "M12 3c-3 5-6 9-6 13a6 6 0 0012 0c0-4-3-8-6-13z M9 15h6",

  // Vibrance — full water droplet (stroked, larger fill curve than Saturation).
  VIBRANCE: "M12 22s8-5 8-12a8 8 0 00-16 0c0 7 8 12 8 12z",

  // Warmth — thermometer (stroked).
  WARMTH:
    "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z M12 6v9",

  // Tint — eyedropper (stroked, distinct from droplets).
  TINT: "M19 3l2 2-9 9-3-3 9-9z M11 11l-7 7v3h3l7-7",

  // Sharpness — solid filled triangle / peak (filled).
  SHARPNESS: "M12 4l9 16H3z",

  // Definition — focus brackets at four corners (stroked).
  DEFINITION:
    "M3 8V5a2 2 0 012-2h3 M21 8V5a2 2 0 00-2-2h-3 M3 16v3a2 2 0 002 2h3 M21 16v3a2 2 0 01-2 2h-3",

  // Noise Reduction — 4×4 grain dot grid (stroked, round caps render as dots).
  NOISE_REDUCTION:
    "M5 5h.01 M10 5h.01 M15 5h.01 M19 5h.01 M5 10h.01 M10 10h.01 M15 10h.01 M19 10h.01 M5 15h.01 M10 15h.01 M15 15h.01 M19 15h.01 M5 19h.01 M10 19h.01 M15 19h.01 M19 19h.01",

  // Vignette — outer rounded frame + inner circle (stroked, two distinct shapes).
  VIGNETTE:
    "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M12 8a4 4 0 100 8 4 4 0 000-8z",

  // Generic tab icons (top-level toolbar)
  PENCIL: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  CROP: "M6.13 1L6 16a2 2 0 002 2h15 M1 6.13L16 6a2 2 0 012 2v15",
  FILTER:
    "M12 15a5 5 0 100-10 5 5 0 000 10z M8 12a5 5 0 100-10 5 5 0 000 10z M16 12a5 5 0 100-10 5 5 0 000 10z",
  ADJUST:
    "M21 4H14M10 4H3M21 12H12M8 12H3M21 20H16M12 20H3M14 2v4M8 10v4M16 18v4",
};

export type IconName = keyof typeof ICON_PATHS;

// Icons whose silhouette is meant to be a solid shape (filled).
// Everything else is rendered as a stroke.
const FILLED_ICONS = new Set<IconName>([
  "AUTO",
  "BRILLIANCE",
  "HIGHLIGHTS",
  "SHADOWS",
  "CONTRAST",
  "BLACK_POINT",
  "SHARPNESS",
  "FILTER",
]);

interface SkiaIconProps {
  name:  IconName;
  color: string;
  size?: number;
}

export const SkiaIcon = ({ name, color, size = 24 }: SkiaIconProps) => {
  const pathData = ICON_PATHS[name];
  if (!pathData) return null;

  const scale  = size / 24;
  const isFill = FILLED_ICONS.has(name);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        <Path
          path={pathData}
          color={color}
          style={isFill ? "fill" : "stroke"}
          strokeWidth={1.6}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
};
