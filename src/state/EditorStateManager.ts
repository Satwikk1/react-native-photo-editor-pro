import { Skia, SkImage, SkPath, PaintStyle } from "@shopify/react-native-skia";
import { Dimensions } from "react-native";
import { makeMutable, SharedValue } from "react-native-reanimated";
import type { AutoTargets } from "../components/adjustments/autoEnhance";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingPath {
  path: SkPath;
  color: string;
  width: number;
}

export interface EditorState {
  cropRect: CropRect | null;
  rotation: number;
  flipX: number;
  exposure: number;
  brilliance: number;
  highlights: number;
  shadows: number;
  contrast: number;
  brightness: number;
  blackPoint: number;
  saturation: number;
  vibrance: number;
  warmth: number;
  tint: number;
  sharpness: number;
  definition: number;
  noiseReduction: number;
  vignette: number;
  paths: DrawingPath[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export class EditorStateManager {
  // Processing values (Normalized for Skia)
  public exposure: SharedValue<number>;
  public brilliance: SharedValue<number>;
  public highlights: SharedValue<number>;
  public shadows: SharedValue<number>;
  public contrast: SharedValue<number>;
  public brightness: SharedValue<number>;
  public blackPoint: SharedValue<number>;
  public saturation: SharedValue<number>;
  public vibrance: SharedValue<number>;
  public warmth: SharedValue<number>;
  public tint: SharedValue<number>;
  public sharpness: SharedValue<number>;
  public definition: SharedValue<number>;
  public noiseReduction: SharedValue<number>;
  public vignette: SharedValue<number>;

  // UI values (Raw slider positions: -100 to 100 or 0 to 100)
  public exposureRaw: SharedValue<number>;
  public brillianceRaw: SharedValue<number>;
  public highlightsRaw: SharedValue<number>;
  public shadowsRaw: SharedValue<number>;
  public contrastRaw: SharedValue<number>;
  public brightnessRaw: SharedValue<number>;
  public blackPointRaw: SharedValue<number>;
  public saturationRaw: SharedValue<number>;
  public vibranceRaw: SharedValue<number>;
  public warmthRaw: SharedValue<number>;
  public tintRaw: SharedValue<number>;
  public sharpnessRaw: SharedValue<number>;
  public definitionRaw: SharedValue<number>;
  public noiseReductionRaw: SharedValue<number>;
  public vignetteRaw: SharedValue<number>;

  // Auto-enhance: intensity (0–1) blends manual sliders toward the analysed targets.
  // Targets live as SharedValues so the colorMatrix worklet can read them reactively.
  public autoIntensity:       SharedValue<number>;  // processed 0–1
  public autoIntensityRaw:    SharedValue<number>;  // UI 0–100
  public autoExposureTarget:   SharedValue<number>;  // neutral 1.0
  public autoContrastTarget:   SharedValue<number>;  // neutral 1.0
  public autoWarmthTarget:     SharedValue<number>;  // neutral 0.0
  public autoSaturationTarget: SharedValue<number>;  // neutral 1.0

  public rotation: SharedValue<number>;
  public flipX: SharedValue<number>;
  public cropRect: SharedValue<CropRect | null>;
  public paths: SharedValue<DrawingPath[]>;
  public readonly originalImage: SkImage;

  constructor(image: SkImage) {
    this.originalImage = image;
    
    // Initialize processing values (Neutral)
    this.exposure = makeMutable(1.0);
    this.brilliance = makeMutable(0.0);
    this.highlights = makeMutable(0.0);
    this.shadows = makeMutable(0.0);
    this.contrast = makeMutable(1.0);
    this.brightness = makeMutable(1.0);
    this.blackPoint = makeMutable(0.0);
    this.saturation = makeMutable(1.0);
    this.vibrance = makeMutable(1.0);
    this.warmth = makeMutable(0.0);
    this.tint = makeMutable(0.0);
    this.sharpness = makeMutable(0.0);
    this.definition = makeMutable(0.0);
    this.noiseReduction = makeMutable(0.0);
    this.vignette = makeMutable(0.0);

    // Initialize UI values (0)
    this.exposureRaw = makeMutable(0);
    this.brillianceRaw = makeMutable(0);
    this.highlightsRaw = makeMutable(0);
    this.shadowsRaw = makeMutable(0);
    this.contrastRaw = makeMutable(0);
    this.brightnessRaw = makeMutable(0);
    this.blackPointRaw = makeMutable(0);
    this.saturationRaw = makeMutable(0);
    this.vibranceRaw = makeMutable(0);
    this.warmthRaw = makeMutable(0);
    this.tintRaw = makeMutable(0);
    this.sharpnessRaw = makeMutable(0);
    this.definitionRaw = makeMutable(0);
    this.noiseReductionRaw = makeMutable(0);
    this.vignetteRaw = makeMutable(0);

    this.autoIntensity       = makeMutable(0);
    this.autoIntensityRaw    = makeMutable(0);
    this.autoExposureTarget   = makeMutable(1.0);
    this.autoContrastTarget   = makeMutable(1.0);
    this.autoWarmthTarget     = makeMutable(0.0);
    this.autoSaturationTarget = makeMutable(1.0);

    this.rotation = makeMutable(0);
    this.flipX = makeMutable(1);
    this.cropRect = makeMutable<CropRect | null>(null);
    this.paths = makeMutable<DrawingPath[]>([]);
  }

  // --- State Updaters ---

  setCrop(rect: CropRect | null) {
    this.cropRect.value = rect;
  }

  rotate() {
    this.rotation.value = (this.rotation.value + 90) % 360;
  }

  flip() {
    this.flipX.value = this.flipX.value === 1 ? -1 : 1;
  }

  addPath(path: DrawingPath) {
    this.paths.value = [...this.paths.value, path];
  }

  setPaths(paths: DrawingPath[]) {
    this.paths.value = paths;
  }

  // --- Getters ---

  getState(): EditorState {
    return {
      cropRect: this.cropRect.value,
      rotation: this.rotation.value,
      flipX: this.flipX.value,
      exposure: this.exposure.value,
      brilliance: this.brilliance.value,
      highlights: this.highlights.value,
      shadows: this.shadows.value,
      contrast: this.contrast.value,
      brightness: this.brightness.value,
      blackPoint: this.blackPoint.value,
      saturation: this.saturation.value,
      vibrance: this.vibrance.value,
      warmth: this.warmth.value,
      tint: this.tint.value,
      sharpness: this.sharpness.value,
      definition: this.definition.value,
      noiseReduction: this.noiseReduction.value,
      vignette: this.vignette.value,
      paths: [...this.paths.value],
    };
  }

  // Stores analysed targets and sets intensity to `initialIntensity` (0–100).
  // Does not touch manual slider values — the blend formula in the shader hooks
  // combines them non-destructively: V_final = V_manual + (V_target - V_neutral) * intensity.
  applyAutoTargets(targets: AutoTargets, initialIntensity = 50) {
    this.autoExposureTarget.value   = targets.exposure;
    this.autoContrastTarget.value   = targets.contrast;
    this.autoWarmthTarget.value     = targets.warmth;
    this.autoSaturationTarget.value = targets.saturation;
    this.autoIntensityRaw.value     = initialIntensity;
    this.autoIntensity.value        = initialIntensity / 100;
  }

  // --- Core Processing Logic ---

  generateFinalImage(): string | null {
    const { 
      cropRect, rotation, flipX, 
      exposure, brilliance, highlights, shadows, 
      contrast, brightness, blackPoint, saturation, 
      vibrance, warmth, tint, 
      sharpness, definition, noiseReduction, vignette,
      paths 
    } = this.getState();
    const image = this.originalImage;

    const surface = Skia.Surface.Make(image.width(), image.height());
    if (!surface) return null;
    const canvas = surface.getCanvas();

    const paint = Skia.Paint();
    
    // NOTE: For now, we still use the basic 4-matrix logic.
    // Full implementation of all 15 parameters requires a custom shader (SKSL).
    // We will implement the simplified matrix for now and expand in next steps.
    
    const lr = 0.2126;
    const lg = 0.7152;
    const lb = 0.0722;

    const rG = 1 + warmth;
    const bG = 1 - warmth;

    const pivot = 0.5;
    const c = contrast;
    const b = brightness;
    const s = saturation;
    const e = exposure;

    const offset = (1 - c) * pivot + (b - 1) + (e - 1);

    const rW = c * rG;
    const gW = c;
    const bW = c * bG;

    const matrix = [
      rW * ((1 - s) * lr + s), rW * ((1 - s) * lg),     rW * ((1 - s) * lb),     0, offset,
      gW * ((1 - s) * lr),     gW * ((1 - s) * lg + s),  gW * ((1 - s) * lb),     0, offset,
      bW * ((1 - s) * lr),     bW * ((1 - s) * lg),     bW * ((1 - s) * lb + s),  0, offset,
      0,                      0,                      0,                      1, 0,
    ];
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));

    canvas.save();
    canvas.translate(image.width() / 2, image.height() / 2);
    canvas.rotate(rotation, 0, 0);
    canvas.scale(flipX, 1);
    canvas.translate(-image.width() / 2, -image.height() / 2);

    canvas.drawImage(image, 0, 0, paint);

    // Draw paths...
    const imgWidth = SCREEN_WIDTH;
    const imgHeight = SCREEN_WIDTH * (image.height() / image.width());
    const EDITOR_HEIGHT = Dimensions.get("window").height * 0.7;
    const yOffset = (EDITOR_HEIGHT - imgHeight) / 2;
    const scaleRatio = image.width() / imgWidth;
    const pathPaint = Skia.Paint();
    pathPaint.setStyle(PaintStyle.Stroke);

    canvas.save();
    canvas.scale(scaleRatio, scaleRatio);
    canvas.translate(0, -yOffset);
    paths.forEach((p) => {
      pathPaint.setColor(Skia.Color(p.color));
      pathPaint.setStrokeWidth(p.width);
      canvas.drawPath(p.path, pathPaint);
    });
    canvas.restore();
    canvas.restore();

    let finalImage = surface.makeImageSnapshot();

    if (cropRect) {
      const cropSurface = Skia.Surface.Make(cropRect.width, cropRect.height);
      if (cropSurface) {
        const cropCanvas = cropSurface.getCanvas();
        const srcRect = Skia.XYWHRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        const dstRect = Skia.XYWHRect(0, 0, cropRect.width, cropRect.height);
        cropCanvas.drawImageRect(finalImage, srcRect, dstRect, Skia.Paint());
        finalImage = cropSurface.makeImageSnapshot();
      }
    }

    const base64Data = finalImage.encodeToBase64();
    return `data:image/jpeg;base64,${base64Data}`;
  }
}
