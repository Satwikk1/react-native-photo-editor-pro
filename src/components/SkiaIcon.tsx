import React from 'react';
import { Canvas, Path, Group } from "@shopify/react-native-skia";

export const ICON_PATHS = {
  // Exposure: Circle with +/- 
  EXPOSURE: "M12 2a10 10 0 100 20 10 10 0 000-20z M8 12h8 M12 8v8",
  
  // Brilliance: Sun with a dot in middle
  BRILLIANCE: "M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0 M12 2v2 M12 20v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M2 12h2 M20 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  
  // Highlights: Upper half circle
  HIGHLIGHTS: "M12 22a10 10 0 100-20 10 10 0 000 20z M21.5 12A9.5 9.5 0 0012 2.5V12h9.5z",
  
  // Shadows: Lower half circle
  SHADOWS: "M12 22a10 10 0 100-20 10 10 0 000 20z M2.5 12A9.5 9.5 0 0012 21.5V12H2.5z",
  
  // Contrast: Half filled circle
  CONTRAST: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 18V6a6 6 0 010 12z",
  
  // Brightness: Classic sun
  BRIGHTNESS: "M12 12m-4 0a4 4 0 108 0 4 4 0 00-8 0 M12 2v3 M12 19v3 M4.22 4.22l2.12 2.12 M17.66 17.66l2.12 2.12 M2 12h3 M19 12h3 M4.22 19.78l2.12-2.12 M17.66 6.34l2.12-2.12",
  
  // Black Point: Solid inner circle
  BLACK_POINT: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 12m-5 0a5 5 0 1010 0 5 5 0 00-10 0",
  
  // Saturation: Concentric circles
  SATURATION: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 12m-7 0a7 7 0 1014 0 7 7 0 00-14 0 M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0",
  
  // Vibrance: Droplet
  VIBRANCE: "M12 22s8-5 8-12a8 8 0 00-16 0c0 7 8 12 8 12z",
  
  // Warmth: Thermometer
  WARMTH: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  
  // Tint: Color Swatch/Layers
  TINT: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  
  // Sharpness: Triangle with interior line
  SHARPNESS: "M12 2l10 20H2L12 2z M12 8v10",
  
  // Definition: Focus square
  DEFINITION: "M3 7V5a2 2 0 012-2h2 M17 3h2a2 2 0 012 2v2 M21 17v2a2 2 0 01-2 2h-2 M7 21H5a2 2 0 01-2-2v-2 M12 12m-1 0a1 1 0 102 0 1 1 0 00-2 0",
  
  // Noise Reduction: Shield or filtered circle
  NOISE_REDUCTION: "M12 22a10 10 0 100-20 10 10 0 000 20z M7 12h10",
  
  // Vignette: Outer focused circle
  VIGNETTE: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 12m-8 0a8 8 0 1016 0 8 8 0 00-16 0",
  
  PENCIL: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  CROP: "M6.13 1L6 16a2 2 0 002 2h15 M1 6.13L16 6a2 2 0 012 2v15",
  FILTER: "M12 15a5 5 0 100-10 5 5 0 000 10z M8 12a5 5 0 100-10 5 5 0 000 10z M16 12a5 5 0 100-10 5 5 0 000 10z",
  ADJUST: "M21 4H14M10 4H3M21 12H12M8 12H3M21 20H16M12 20H3M14 2v4M8 10v4M16 18v4",
};

export type IconName = keyof typeof ICON_PATHS;

interface SkiaIconProps {
  name: IconName;
  color: string;
  size?: number;
}

export const SkiaIcon = ({ name, color, size = 24 }: SkiaIconProps) => {
  const pathData = ICON_PATHS[name];
  if (!pathData) return null;

  const scale = size / 24;

  // Define which icons should use fill vs stroke
  const fillIcons = ["CONTRAST", "HIGHLIGHTS", "SHADOWS", "BLACK_POINT", "SATURATION", "FILTER"];
  const isFill = fillIcons.includes(name);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        <Path
          path={pathData}
          color={color}
          style={isFill ? "fill" : "stroke"}
          strokeWidth={1.5}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
};
