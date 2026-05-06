import { Skia } from "@shopify/react-native-skia";
import type { SkRuntimeEffect } from "@shopify/react-native-skia";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterCategory = "original" | "analog" | "cinematic" | "bw";

export interface FilterConfig {
  id:       string;
  name:     string;
  category: FilterCategory;
  // Exactly one of the two is defined:
  matrix?: number[];         // 4×5 row-major, offsets in [0, 1] range
  effect?: SkRuntimeEffect | null;  // pre-compiled SkSL for shader-based filters
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export const IDENTITY_MATRIX: number[] = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// Lerp every element of `matrix` toward identity at factor t (0 = identity, 1 = full filter).
// 'worklet' directive is required so Reanimated can run this on the UI thread inside
// useDerivedValue without crossing the JS bridge.
export function blendMatrix(matrix: number[], t: number): number[] {
  "worklet";
  // Inline identity so the worklet has no external array reference.
  const id = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
  const out: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    out.push(id[i] + (matrix[i] - id[i]) * t);
  }
  return out;
}

// ─── SkSL shaders ────────────────────────────────────────────────────────────
// Each shader receives `image` (the source) and `intensity` (0–1). The lerp
// between original and graded is done inside the shader so the GPU does it
// in a single pass with no extra texture read.

const TEAL_ORANGE_SKSL = `
  uniform shader image;
  uniform float  intensity;

  vec4 main(vec2 coord) {
    vec4 orig  = image.eval(coord);
    float luma = dot(orig.rgb, vec3(0.2126, 0.7152, 0.0722));

    float shadowMask    = smoothstep(0.5, 0.0,  luma);
    float highlightMask = smoothstep(0.5, 1.0,  luma);

    vec3 graded = orig.rgb;
    graded = mix(graded, vec3(0.0, 0.50, 0.50), shadowMask    * 0.40);
    graded = mix(graded, vec3(1.0, 0.62, 0.20), highlightMask * 0.30);

    return vec4(clamp(mix(orig.rgb, graded, intensity), 0.0, 1.0), orig.a);
  }
`;

const GOLDEN_HOUR_SKSL = `
  uniform shader image;
  uniform float  intensity;

  vec4 main(vec2 coord) {
    vec4 orig  = image.eval(coord);
    float luma = dot(orig.rgb, vec3(0.2126, 0.7152, 0.0722));

    float warmMask  = smoothstep(0.25, 1.0, luma);
    float shadowLift = smoothstep(0.3, 0.0, luma) * 0.06;

    vec3 graded = orig.rgb;
    graded = mix(graded, vec3(1.0, 0.75, 0.35), warmMask * 0.22);
    graded += vec3(shadowLift * 0.6, shadowLift * 0.35, 0.0);

    return vec4(clamp(mix(orig.rgb, graded, intensity), 0.0, 1.0), orig.a);
  }
`;

const tealOrangeEffect = Skia.RuntimeEffect.Make(TEAL_ORANGE_SKSL);
const goldenHourEffect  = Skia.RuntimeEffect.Make(GOLDEN_HOUR_SKSL);

// ─── Filter registry ──────────────────────────────────────────────────────────

export const PRO_FILTERS: FilterConfig[] = [
  // ── Original ──────────────────────────────────────────────────────────────
  {
    id:       "original",
    name:     "ORIGINAL",
    category: "original",
    matrix:   IDENTITY_MATRIX,
  },

  // ── Analog Film ───────────────────────────────────────────────────────────
  {
    id:       "portra_400",
    name:     "PORTRA 400",
    category: "analog",
    // Warm, pastel-like reds, softened greens — the portrait standard.
    matrix: [
       1.12, -0.02, -0.10, 0,  0.05,
      -0.10,  1.05, -0.15, 0,  0.05,
      -0.20, -0.10,  1.40, 0, -0.10,
          0,     0,     0, 1,     0,
    ],
  },
  {
    id:       "velvia_50",
    name:     "VELVIA 50",
    category: "analog",
    // Intense saturated greens and deep blues — landscape legend.
    matrix: [
       1.30, -0.10, -0.10, 0, 0,
       0.00,  1.50, -0.20, 0, 0,
      -0.10, -0.10,  1.60, 0, 0,
          0,     0,     0, 1, 0,
    ],
  },
  {
    id:       "kodachrome_64",
    name:     "KODACHROME",
    category: "analog",
    // Warm reds, punchy contrast, characteristic yellow-green mid-shift.
    matrix: [
       1.20, -0.05, -0.10, 0,  0.02,
      -0.05,  1.10, -0.10, 0,  0.02,
      -0.15, -0.05,  1.00, 0, -0.05,
          0,     0,     0, 1,     0,
    ],
  },
  {
    id:       "cross_process",
    name:     "CROSS PROC",
    category: "analog",
    // E6 film processed in C41 chemistry: green-teal shadows, yellow highlights.
    matrix: [
       1.40, -0.30,  0.10, 0,  0.05,
       0.10,  1.20, -0.10, 0,  0.02,
      -0.20, -0.10,  1.50, 0,  0.05,
          0,     0,     0, 1,     0,
    ],
  },

  // ── Cinematic ─────────────────────────────────────────────────────────────
  {
    id:       "teal_orange",
    name:     "CINEMATIC",
    category: "cinematic",
    effect:   tealOrangeEffect,
  },
  {
    id:       "golden_hour",
    name:     "GOLDEN HOUR",
    category: "cinematic",
    effect:   goldenHourEffect,
  },
  {
    id:       "matte",
    name:     "MATTE",
    category: "cinematic",
    // Lifted blacks, reduced contrast — the Instagram "faded" look.
    matrix: [
       0.85, 0,    0,    0, 0.08,
       0,    0.85, 0,    0, 0.08,
       0,    0,    0.85, 0, 0.10,
       0,    0,    0,    1,    0,
    ],
  },
  {
    id:       "cyberpunk",
    name:     "CYBERPUNK",
    category: "cinematic",
    // Heavy magenta/cyan split, crushed blacks, neon pop.
    matrix: [
       1.50, -0.50,  0.50, 0, 0.10,
      -0.20,  1.20, -0.20, 0, 0.00,
       0.50, -0.50,  1.80, 0, 0.20,
          0,     0,     0, 1,    0,
    ],
  },

  // ── Black & White ─────────────────────────────────────────────────────────
  {
    id:       "ilford_hp5",
    name:     "ILFORD HP5",
    category: "bw",
    // Red-filter B&W: dark skies, bright skin tones, punchy grain feel.
    matrix: [
       1.2, 0, 0, 0, -0.10,
       1.2, 0, 0, 0, -0.10,
       1.2, 0, 0, 0, -0.10,
         0, 0, 0, 1,     0,
    ],
  },
  {
    id:       "ilford_delta",
    name:     "DELTA 100",
    category: "bw",
    // Green-filter B&W: brightens foliage, natural for outdoor portraits.
    matrix: [
       0, 1.4, 0, 0, -0.10,
       0, 1.4, 0, 0, -0.10,
       0, 1.4, 0, 0, -0.10,
       0,   0, 0, 1,     0,
    ],
  },
  {
    id:       "selenium",
    name:     "SELENIUM",
    category: "bw",
    // Darkroom selenium toning: desaturated with a cool blue-purple shadow cast.
    matrix: [
       0.70, 0.15, 0.15, 0, -0.03,
       0.65, 0.12, 0.12, 0, -0.03,
       0.75, 0.18, 0.18, 0,  0.03,
          0,    0,    0, 1,     0,
    ],
  },
];
