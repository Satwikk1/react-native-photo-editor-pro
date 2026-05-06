import { Skia } from "@shopify/react-native-skia";
import type { IconName } from "../SkiaIcon";

// ─── Tool enum ────────────────────────────────────────────────────────────────

export enum AdjustTool {
  EXPOSURE        = "EXPOSURE",
  BRILLIANCE      = "BRILLIANCE",
  HIGHLIGHTS      = "HIGHLIGHTS",
  SHADOWS         = "SHADOWS",
  CONTRAST        = "CONTRAST",
  BRIGHTNESS      = "BRIGHTNESS",
  BLACK_POINT     = "BLACK_POINT",
  SATURATION      = "SATURATION",
  VIBRANCE        = "VIBRANCE",
  WARMTH          = "WARMTH",
  TINT            = "TINT",
  SHARPNESS       = "SHARPNESS",
  DEFINITION      = "DEFINITION",
  NOISE_REDUCTION = "NOISE_REDUCTION",
  VIGNETTE        = "VIGNETTE",
}

// ─── Tool UI metadata ─────────────────────────────────────────────────────────

export interface ToolMeta {
  id:    AdjustTool;
  name:  string;
  icon:  IconName;
  range: [number, number];
}

export const ADJUST_TOOLS: ToolMeta[] = [
  { id: AdjustTool.EXPOSURE,        name: "EXPOSURE",        icon: "EXPOSURE",        range: [-100, 100] },
  { id: AdjustTool.BRILLIANCE,      name: "BRILLIANCE",      icon: "BRILLIANCE",      range: [-100, 100] },
  { id: AdjustTool.HIGHLIGHTS,      name: "HIGHLIGHTS",      icon: "HIGHLIGHTS",      range: [-100, 100] },
  { id: AdjustTool.SHADOWS,         name: "SHADOWS",         icon: "SHADOWS",         range: [-100, 100] },
  { id: AdjustTool.CONTRAST,        name: "CONTRAST",        icon: "CONTRAST",        range: [-100, 100] },
  { id: AdjustTool.BRIGHTNESS,      name: "BRIGHTNESS",      icon: "BRIGHTNESS",      range: [-100, 100] },
  { id: AdjustTool.BLACK_POINT,     name: "BLACK POINT",     icon: "BLACK_POINT",     range: [-100, 100] },
  { id: AdjustTool.SATURATION,      name: "SATURATION",      icon: "SATURATION",      range: [-100, 100] },
  { id: AdjustTool.VIBRANCE,        name: "VIBRANCE",        icon: "VIBRANCE",        range: [-100, 100] },
  { id: AdjustTool.WARMTH,          name: "WARMTH",          icon: "WARMTH",          range: [-100, 100] },
  { id: AdjustTool.TINT,            name: "TINT",            icon: "TINT",            range: [-100, 100] },
  { id: AdjustTool.SHARPNESS,       name: "SHARPNESS",       icon: "SHARPNESS",       range: [0,    100] },
  { id: AdjustTool.DEFINITION,      name: "DEFINITION",      icon: "DEFINITION",      range: [0,    100] },
  { id: AdjustTool.NOISE_REDUCTION, name: "NOISE REDUCTION", icon: "NOISE_REDUCTION", range: [0,    100] },
  { id: AdjustTool.VIGNETTE,        name: "VIGNETTE",        icon: "VIGNETTE",        range: [-100, 100] },
];

// ─── Tool → state key + normalizer config ────────────────────────────────────
//
// Replaces the two 15-case switch statements in the component.
// rawKey/procKey are the EditorStateManager property names for the raw (UI) and
// processed (Skia) values. normalize() converts the slider's -100…100 range into
// whatever unit the shader/matrix expects.

export interface ToolStateConfig {
  rawKey:    string;
  procKey:   string;
  normalize: (val: number) => number;
}

export const TOOL_STATE_CONFIG: Record<AdjustTool, ToolStateConfig> = {
  [AdjustTool.EXPOSURE]:        { rawKey: "exposureRaw",        procKey: "exposure",        normalize: v => 1 + v / 100 },
  [AdjustTool.BRILLIANCE]:      { rawKey: "brillianceRaw",      procKey: "brilliance",      normalize: v => v / 100     },
  [AdjustTool.HIGHLIGHTS]:      { rawKey: "highlightsRaw",      procKey: "highlights",      normalize: v => v / 100     },
  [AdjustTool.SHADOWS]:         { rawKey: "shadowsRaw",         procKey: "shadows",         normalize: v => v / 100     },
  [AdjustTool.CONTRAST]:        { rawKey: "contrastRaw",        procKey: "contrast",        normalize: v => 1 + v / 100 },
  [AdjustTool.BRIGHTNESS]:      { rawKey: "brightnessRaw",      procKey: "brightness",      normalize: v => 1 + v / 100 },
  [AdjustTool.BLACK_POINT]:     { rawKey: "blackPointRaw",      procKey: "blackPoint",      normalize: v => v / 100     },
  [AdjustTool.SATURATION]:      { rawKey: "saturationRaw",      procKey: "saturation",      normalize: v => 1 + v / 100 },
  [AdjustTool.VIBRANCE]:        { rawKey: "vibranceRaw",        procKey: "vibrance",        normalize: v => 1 + v / 100 },
  [AdjustTool.WARMTH]:          { rawKey: "warmthRaw",          procKey: "warmth",          normalize: v => v / 500     },
  [AdjustTool.TINT]:            { rawKey: "tintRaw",            procKey: "tint",            normalize: v => v / 500     },
  [AdjustTool.SHARPNESS]:       { rawKey: "sharpnessRaw",       procKey: "sharpness",       normalize: v => v / 100     },
  [AdjustTool.DEFINITION]:      { rawKey: "definitionRaw",      procKey: "definition",      normalize: v => v / 100     },
  [AdjustTool.NOISE_REDUCTION]: { rawKey: "noiseReductionRaw",  procKey: "noiseReduction",  normalize: v => v / 100     },
  [AdjustTool.VIGNETTE]:        { rawKey: "vignetteRaw",        procKey: "vignette",        normalize: v => v / 100     },
};

// ─── Master SkSL shader ───────────────────────────────────────────────────────
//
// Single GPU pass that handles every effect that cannot be expressed as a linear
// 4×5 ColorMatrix. Runs after the ColorMatrix so it receives the already
// exposure/contrast/saturation-corrected image via image.eval(coord).
//
// Effect order matters — see inline notes.

const MASTER_SKSL = `
  uniform shader image;
  uniform float vibrance;
  uniform float shadows;
  uniform float highlights;
  uniform float brilliance;
  uniform float vignette;
  uniform float sharpness;
  uniform float definition;
  uniform float noiseReduction;
  uniform float2 canvasSize;

  vec4 main(vec2 coord) {
    // 1. Noise Reduction — 9-tap box blur. Must run before sharpening so we
    //    denoise the signal first, then re-introduce controlled detail.
    //    nr=0 → mix weight=0 → pure passthrough, no extra samples matter.
    float nr = noiseReduction * 2.0;
    vec4 blurredNR = (
      image.eval(coord + vec2(-nr, -nr)) + image.eval(coord + vec2(0.0, -nr)) + image.eval(coord + vec2(nr, -nr)) +
      image.eval(coord + vec2(-nr,  0.0)) + image.eval(coord)                + image.eval(coord + vec2(nr,  0.0)) +
      image.eval(coord + vec2(-nr,  nr))  + image.eval(coord + vec2(0.0,  nr)) + image.eval(coord + vec2(nr,  nr))
    ) / 9.0;
    vec4 c = mix(image.eval(coord), blurredNR, noiseReduction);

    // 2. Sharpness — tight unsharp mask (1 px radius, high gain).
    vec4 blurredS = (
      image.eval(coord + vec2(-1.0, 0.0)) + image.eval(coord + vec2(1.0, 0.0)) +
      image.eval(coord + vec2(0.0, -1.0)) + image.eval(coord + vec2(0.0, 1.0))
    ) / 4.0;
    c.rgb += (c.rgb - blurredS.rgb) * sharpness * 3.0;

    // 3. Definition — clarity via wider unsharp mask (2 px catches mid-frequency).
    vec4 blurredDef = (
      image.eval(coord + vec2(-2.0, 0.0)) + image.eval(coord + vec2(2.0, 0.0)) +
      image.eval(coord + vec2(0.0, -2.0)) + image.eval(coord + vec2(0.0, 2.0))
    ) / 4.0;
    c.rgb += (c.rgb - blurredDef.rgb) * definition * 2.0;

    // 4. Brilliance — parabolic midtone lift (peaks at luma=0.5, zero at 0 and 1).
    float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float brillianceFactor = brilliance * (1.0 - pow(luma * 2.0 - 1.0, 2.0));
    c.rgb += brillianceFactor * (c.rgb * 0.5);

    // Recompute luma after brilliance so highlight/shadow masks are accurate.
    luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));

    // 5. Highlights — scale bright pixels (smoothstep mask peaks above 0.4).
    float hMask = smoothstep(0.4, 0.9, luma);
    c.rgb *= (1.0 + highlights * hMask);

    // 6. Shadows — scale dark pixels (smoothstep mask peaks below 0.6).
    float sMask = 1.0 - smoothstep(0.1, 0.6, luma);
    c.rgb *= (1.0 + shadows * sMask);

    // 7. Vibrance — preferentially boosts unsaturated colours.
    float maxC  = max(c.r, max(c.g, c.b));
    float minC  = min(c.r, min(c.g, c.b));
    float sat   = maxC - minC;
    float luma2 = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    c.rgb = mix(vec3(luma2), c.rgb, 1.0 + vibrance * (1.0 - sat));

    // 8. Vignette — bidirectional radial mask applied last so it is unaffected
    //    by the colour ops above. Positive → darken edges, negative → lighten.
    vec2  uv      = coord / canvasSize;
    float dist    = distance(uv, vec2(0.5));
    float vgnMask = smoothstep(0.3, 0.8, dist);
    c.rgb *= 1.0 + (-vignette * vgnMask);

    c.rgb = clamp(c.rgb, 0.0, 1.0);
    return c;
  }
`;

export const masterShaderEffect = Skia.RuntimeEffect.Make(MASTER_SKSL)!;
