import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoTargets {
  exposure:   number;  // neutral 1.0  — stored scale: 1 + val/100
  contrast:   number;  // neutral 1.0  — stored scale: 1 + val/100
  warmth:     number;  // neutral 0.0  — stored scale: val/500
  saturation: number;  // neutral 1.0  — stored scale: 1 + val/100
}

// Tonal zone boundaries (luminance)
const ZONE = {
  blacksMax:     0.05,
  shadowsMax:    0.35,
  midtonesMax:   0.65,
  highlightsMax: 0.95,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeImage(image: SkImage): Promise<AutoTargets | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(runAnalysis(image)), 0);
  });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

const SAMPLE_SIZE = 100;

function runAnalysis(image: SkImage): AutoTargets | null {
  const surface = Skia.Surface.Make(SAMPLE_SIZE, SAMPLE_SIZE);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE),
    Skia.Paint(),
  );

  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot.readPixels(0, 0, {
    width:     SAMPLE_SIZE,
    height:    SAMPLE_SIZE,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixels) return null;
  return calculateTargets(pixels as Uint8Array);
}

// ─── Bucketized histogram analysis ───────────────────────────────────────────
//
// Pipeline order: Black Point detection → White Balance → Median Exposure →
// Dynamic Range / Contrast. This mirrors how a darkroom technician approaches
// a print — fix the tonal floor first, then colour, then overall key.

function calculateTargets(pixels: Uint8Array): AutoTargets {
  const count = pixels.length / 4;

  let rSum = 0, gSum = 0, bSum = 0;
  let skinPixels = 0;

  // Tonal-zone pixel counts
  let blacks = 0, shadows = 0, midtones = 0, highlights = 0, whites = 0;

  const lumas = new Float32Array(count);

  for (let i = 0, pi = 0; i < pixels.length; i += 4, pi++) {
    const r = pixels[i]     / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;

    rSum += r;
    gSum += g;
    bSum += b;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumas[pi] = luma;

    if      (luma < ZONE.blacksMax)     blacks++;
    else if (luma < ZONE.shadowsMax)    shadows++;
    else if (luma < ZONE.midtonesMax)   midtones++;
    else if (luma < ZONE.highlightsMax) highlights++;
    else                                whites++;

    // Skin-tone heuristic: warm hue (r > g > b) with red dominance
    const rg = r / (g + 0.001);
    const gb = g / (b + 0.001);
    if (rg > 1.1 && rg < 2.2 && gb > 1.0 && gb < 2.0 && r > 0.35) skinPixels++;
  }

  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;

  // Sort for percentile metrics
  lumas.sort();
  const p5     = lumas[Math.floor(count * 0.05)];
  const p50    = lumas[Math.floor(count * 0.50)];  // median
  const p95    = lumas[Math.floor(count * 0.95)];

  const skinRatio = skinPixels / count;
  const dynamicRange = p95 - p5;

  // ── 1. Black Point ────────────────────────────────────────────────────────
  // If >15% of pixels are crushed blacks, there's likely a lifted black floor
  // (foggy/hazy image). We don't expose a target for blackPoint in the blend
  // formula yet, so this informs the contrast calculation only.
  const hasFoggyBlacks = blacks / count < 0.02 && p5 > 0.08;

  // ── 2. White Balance (Grey World) ────────────────────────────────────────
  // Correct toward a neutral grey; scale already in val/500 units.
  const warmth = clamp((avgR - avgB) * 0.5, -0.2, 0.2);

  // ── 3. Median-based Exposure ─────────────────────────────────────────────
  // Pull the median (P50) toward 0.42 — slightly below mid-gray for a natural
  // film-like key. Using median rather than mean is less sensitive to clipped
  // highlights or crushed blacks skewing the average.
  const targetKey = 0.42;
  const exposure = clamp(1.0 + (targetKey - p50), 0.5, 2.0);

  // ── 4. Contrast (Dynamic Range) ──────────────────────────────────────────
  // Flat histogram (low dynamic range) or foggy blacks → push contrast up.
  // Wide histogram → leave contrast at neutral.
  let contrast = 1.0;
  if (dynamicRange < 0.65 || hasFoggyBlacks) {
    contrast = clamp(1.0 + (0.7 - dynamicRange) * 0.7, 1.0, 1.5);
  }
  // Portraits (high skin ratio): keep contrast subtle to avoid harsh shadows.
  if (skinRatio > 0.25) contrast = Math.min(contrast, 1.2);

  // ── 5. Saturation ────────────────────────────────────────────────────────
  // Skin-heavy images get gentle +5%; everything else gets +15%.
  // Extra guard: if the image is very desaturated (avgG ≈ avgR ≈ avgB),
  // push saturation harder to bring life back.
  const isDesaturated = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB) < 0.06;
  let saturation = skinRatio > 0.3 ? 1.05 : 1.15;
  if (isDesaturated) saturation = Math.min(saturation + 0.1, 1.25);

  return { exposure, contrast, warmth, saturation };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
