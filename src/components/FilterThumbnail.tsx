import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Canvas, ColorMatrix, Image, RuntimeShader } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";

import type { FilterConfig } from "./filters/registry";
import { IDENTITY_MATRIX } from "./filters/registry";

const THUMB_W = 58;
const THUMB_H = 76;
const RADIUS  = 8;

interface FilterThumbnailProps {
  image:        SkImage;
  filter:       FilterConfig;
  isActive:     boolean;
  onPress:      () => void;
  primaryColor?: string;
}

export const FilterThumbnail = ({ image, filter, isActive, onPress, primaryColor = "#FFD60A" }: FilterThumbnailProps) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
    <View style={styles.wrapper}>
      {/* Canvas — borderRadius + overflow clipping lives on the Canvas itself
          because Skia canvases don't honour a parent View's overflow:hidden. */}
      <Canvas style={styles.canvas}>
        <Image image={image} x={0} y={0} width={THUMB_W} height={THUMB_H} fit="cover">
          {filter.effect
            ? <RuntimeShader source={filter.effect} uniforms={{ intensity: 1.0 }} />
            : <ColorMatrix matrix={filter.matrix ?? IDENTITY_MATRIX} />
          }
        </Image>
      </Canvas>

      {/* Selection border rendered as an absolute overlay so it sits on top of the
          image without interfering with the Canvas clipping region. */}
      {isActive && <View style={[styles.activeBorder, { borderColor: primaryColor }]} />}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    width:        THUMB_W,
    height:       THUMB_H,
    borderRadius: RADIUS,
    overflow:     "hidden",  // clips the Canvas on the native side
  },
  canvas: {
    width:        THUMB_W,
    height:       THUMB_H,
    borderRadius: RADIUS,   // Skia respects this on its own layer
    overflow:     "hidden",
  },
  activeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    borderWidth:  2.5,
  },
});
