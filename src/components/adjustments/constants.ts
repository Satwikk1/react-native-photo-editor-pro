import { Skia } from "@shopify/react-native-skia";
import type { IconName } from "../SkiaIcon";

// ─── Tool enum ────────────────────────────────────────────────────────────────

export enum AdjustTool {
  AUTO            = "AUTO",
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
  { id: AdjustTool.AUTO,            name: "AUTO",            icon: "AUTO",            range: [0,    100] },
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
  // AUTO controls blend intensity; the targets are set separately via applyAutoTargets().
  [AdjustTool.AUTO]:            { rawKey: "autoIntensityRaw",   procKey: "autoIntensity",   normalize: v => v / 100     },
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
  uniform float4x4 colorMatrix;
  uniform float4 colorOffset;
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
    // 0. Linear Corrections (Color Matrix)
    // Apply exposure, contrast, saturation, warmth, etc. before non-linear ops.
    vec4 c = image.eval(coord);
    c = colorMatrix * c + colorOffset;
    c = clamp(c, 0.0, 1.0);

    // 1. Noise Reduction — resolution-aware box blur.
    // Calculate a sampling radius that scales with the image resolution.
    // We target a ~1px radius at 1000px width.
    float resScale = canvasSize.x / 1000.0;
    float nr = noiseReduction * 2.0 * resScale;

    vec4 blurredNR = (
      (colorMatrix * image.eval(coord + vec2(-nr, -nr)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0, -nr)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(nr, -nr))  + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(-nr,  0.0)) + colorOffset) +
      c +
      (colorMatrix * image.eval(coord + vec2(nr,  0.0)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(-nr,  nr))  + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0,  nr)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(nr,  nr))  + colorOffset)
    ) / 9.0;
    c = mix(c, blurredNR, noiseReduction);

    // 2. Sharpness — unsharp mask with resolution-aware radius.
    float sRadius = 1.0 * resScale;
    vec4 blurredS = (
      (colorMatrix * image.eval(coord + vec2(-sRadius, 0.0)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(sRadius, 0.0))  + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0, -sRadius)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0, sRadius))  + colorOffset)
    ) / 4.0;
    c.rgb += (c.rgb - blurredS.rgb) * sharpness * 3.0;

    // 3. Definition — wider unsharp mask.
    float dRadius = 2.0 * resScale;
    vec4 blurredDef = (
      (colorMatrix * image.eval(coord + vec2(-dRadius, 0.0)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(dRadius, 0.0))  + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0, -dRadius)) + colorOffset) +
      (colorMatrix * image.eval(coord + vec2(0.0, dRadius))  + colorOffset)
    ) / 4.0;
    c.rgb += (c.rgb - blurredDef.rgb) * definition * 2.0;

    // 4. Brilliance — quadratic lift: f(x) = x + B·x·(1−x), preserves blacks and
    //    whites while lifting midtones. Small contrast re-application adds micro-contrast.
    float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    c.rgb = c.rgb + brilliance * c.rgb * (1.0 - c.rgb);
    c.rgb = (c.rgb - 0.5) * (1.0 + brilliance * 0.1) + 0.5;

    // Recompute luma after brilliance so highlight/shadow masks are accurate.
    luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));

    // 5. Highlights — scale bright pixels (smoothstep mask peaks above 0.4).
    float hMask = smoothstep(0.4, 0.9, luma);
    c.rgb *= (1.0 + highlights * hMask);

    // 6. Shadows — scale dark pixels (smoothstep mask peaks below 0.6).
    float sMask = 1.0 - smoothstep(0.1, 0.6, luma);
    c.rgb *= (1.0 + shadows * sMask);

    // 7. Vibrance — preferentially boosts unsaturated colours with skin-tone protection.
    //    Skin tones (warm hue, moderate red dominance) get a 70% vibrance reduction
    //    so portraits don't turn orange at high vibrance values.
    float maxC  = max(c.r, max(c.g, c.b));
    float minC  = min(c.r, min(c.g, c.b));
    float sat   = maxC - minC;
    float luma2 = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float isSkin = smoothstep(0.1, 0.4, c.r / (c.g + 0.001))
                 * (1.0 - smoothstep(0.4, 0.6, c.g / (c.r + 0.001)));
    float vibranceMult = 1.0 + vibrance * (1.0 - sat) * (1.0 - isSkin * 0.7);
    c.rgb = mix(vec3(luma2), c.rgb, vibranceMult);

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

const FILTER_SKSL = `
  uniform shader image;
  uniform float4 fMat0, fMat1, fMat2, fMat3, fMat4;
  vec4 main(vec2 coord) {
    vec4 c = image.eval(coord);
    float r = dot(c, fMat0) + fMat4.r;
    float g = dot(c, fMat1) + fMat4.g;
    float b = dot(c, fMat2) + fMat4.b;
    float a = dot(c, fMat3) + fMat4.a;
    return vec4(r, g, b, a);
  }
`;
export const filterMatrixEffect = Skia.RuntimeEffect.Make(FILTER_SKSL)!;
