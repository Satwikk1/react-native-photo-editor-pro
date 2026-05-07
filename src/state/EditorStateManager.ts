import {
  Skia,
  SkImage,
  SkPath,
  PaintStyle,
  TileMode,
  FilterMode,
  MipmapMode,
  ImageFormat,
  StrokeCap,
  StrokeJoin,
} from "@shopify/react-native-skia";
import { masterShaderEffect } from "../components/adjustments/constants";
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
  path: SkPath; // Stored in normalized (0..1) coordinate space relative to image
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
  autoIntensity: number;
  autoExposureTarget: number;
  autoContrastTarget: number;
  autoWarmthTarget: number;
  autoSaturationTarget: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  public autoIntensity: SharedValue<number>; // processed 0–1
  public autoIntensityRaw: SharedValue<number>; // UI 0–100
  public autoExposureTarget: SharedValue<number>; // neutral 1.0
  public autoContrastTarget: SharedValue<number>; // neutral 1.0
  public autoWarmthTarget: SharedValue<number>; // neutral 0.0
  public autoSaturationTarget: SharedValue<number>; // neutral 1.0

  public rotation: SharedValue<number>;
  public flipX: SharedValue<number>;
  public cropRect: SharedValue<CropRect | null>;
  public paths: SharedValue<DrawingPath[]>;
  public originalImage: SkImage;

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

    this.autoIntensity = makeMutable(0);
    this.autoIntensityRaw = makeMutable(0);
    this.autoExposureTarget = makeMutable(1.0);
    this.autoContrastTarget = makeMutable(1.0);
    this.autoWarmthTarget = makeMutable(0.0);
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

  // Bakes rotation + flip + perspective + crop into a new originalImage.
  // pitch/yaw in radians. Resets all geometric state after.
  commitCrop(pitch = 0, yaw = 0): void {
    const img = this.originalImage;
    const rot = this.rotation.value; // degrees (already includes straighten)
    const fx = this.flipX.value;
    const cr = this.cropRect.value;
    const w = img.width(),
      h = img.height();
    const cx = w / 2,
      cy = h / 2;

    // Perspective distance scaled to image pixel space.
    // 700px was calibrated for ~SCREEN_WIDTH display; scale proportionally.
    const d = 700 * (w / SCREEN_WIDTH);

    // Auto-scale — same formula as the UI worklet so no black corners.
    const θ = (rot * Math.PI) / 180;
    const cosT = Math.cos(Math.abs(θ));
    const sinT = Math.sin(Math.abs(θ));
    const straightenScale = Math.max(
      (w * cosT + h * sinT) / w,
      (w * sinT + h * cosT) / h,
    );
    const pitchScale =
      Math.abs(pitch) > 0.001 ? 1 / Math.cos(Math.abs(pitch)) : 1;
    const yawScale = Math.abs(yaw) > 0.001 ? 1 / Math.cos(Math.abs(yaw)) : 1;
    const s = straightenScale * pitchScale * yawScale;

    // ── Step 1: bake all transforms into a full-size surface ──────────────────
    const surf = Skia.Surface.Make(w, h);
    if (!surf) return;
    const canvas = surf.getCanvas();

    canvas.save();
    canvas.translate(cx, cy); // pivot = image centre

    // Perspective matrices in Skia 3×3 homogeneous form.
    // M_rx: rotateX(pitch) with perspective d → [1,0,0, 0,cosα,0, 0,sinα/d,1]
    // M_ry: rotateY(yaw)   with perspective d → [cosβ,0,0, 0,1,0, sinβ/d,0,1]
    // Applied outer → inner, matching the CSS transform order.
    if (Math.abs(pitch) > 0.001) {
      const α = pitch;
      canvas.concat(
        Skia.Matrix([1, 0, 0, 0, Math.cos(α), 0, 0, Math.sin(α) / d, 1]),
      );
    }
    if (Math.abs(yaw) > 0.001) {
      const β = yaw;
      canvas.concat(
        Skia.Matrix([Math.cos(β), 0, 0, 0, 1, 0, Math.sin(β) / d, 0, 1]),
      );
    }

    canvas.rotate(rot, 0, 0);
    canvas.scale(fx * s, s);
    canvas.drawImage(img, -cx, -cy, Skia.Paint());

    // ── Bake current paths into the image before committing ──
    if (this.paths.value.length > 0) {
      const pathPaint = Skia.Paint();
      pathPaint.setStyle(PaintStyle.Stroke);
      pathPaint.setStrokeCap(StrokeCap.Round);
      pathPaint.setStrokeJoin(StrokeJoin.Round);

      canvas.save();
      // Move to top-left of image for drawing
      canvas.translate(-cx, -cy);
      // Scale by image size to draw normalized (0..1) paths
      canvas.scale(w, h);

      this.paths.value.forEach((p) => {
        pathPaint.setColor(Skia.Color(p.color));
        // Scale stroke width relative to SCREEN_WIDTH for consistency
        pathPaint.setStrokeWidth(p.width / SCREEN_WIDTH);
        canvas.drawPath(p.path, pathPaint);
      });
      canvas.restore();
    }

    canvas.restore();

    let committed: SkImage = surf.makeImageSnapshot();

    // ── Step 2: apply crop ────────────────────────────────────────────────────
    if (cr && cr.width > 0 && cr.height > 0) {
      const cw = Math.round(cr.width),
        ch = Math.round(cr.height);
      const cropSurf = Skia.Surface.Make(cw, ch);
      if (cropSurf) {
        cropSurf
          .getCanvas()
          .drawImageRect(
            committed,
            Skia.XYWHRect(cr.x, cr.y, cr.width, cr.height),
            Skia.XYWHRect(0, 0, cw, ch),
            Skia.Paint(),
          );
        committed = cropSurf.makeImageSnapshot();
      }
    }

    // ── Step 3: replace image and reset geometric state ───────────────────────
    this.originalImage = committed;
    this.cropRect.value = null;
    this.rotation.value = 0;
    this.flipX.value = 1;
    this.paths.value = []; // Clear paths as they are now baked into the image
  }

  addPath(path: DrawingPath) {
    this.paths.value = [...this.paths.value, path];
  }

  setPaths(paths: DrawingPath[]) {
    this.paths.value = paths;
  }

  // Bakes ONLY the current vector paths (markup) into the originalImage.
  // This allows the user to finalize drawings while keeping filters/adjustments
  // live and non-destructive.
  commitPaths(): void {
    const img = this.originalImage;
    const w = img.width(),
      h = img.height();

    const surf = Skia.Surface.Make(w, h);
    if (!surf) return;
    const canvas = surf.getCanvas();

    // 1. Draw the base image as-is (no filters)
    canvas.drawImage(img, 0, 0, Skia.Paint());

    // 2. Draw paths on top
    if (this.paths.value.length > 0) {
      const pathPaint = Skia.Paint();
      pathPaint.setStyle(PaintStyle.Stroke);
      pathPaint.setStrokeCap(StrokeCap.Round);
      pathPaint.setStrokeJoin(StrokeJoin.Round);

      canvas.save();
      canvas.scale(w, h);
      this.paths.value.forEach((p) => {
        pathPaint.setColor(Skia.Color(p.color));
        pathPaint.setStrokeWidth(p.width / SCREEN_WIDTH);
        canvas.drawPath(p.path, pathPaint);
      });
      canvas.restore();
    }

    this.originalImage = surf.makeImageSnapshot();
    this.paths.value = []; // Clear paths as they are now part of the pixels
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
      autoIntensity: this.autoIntensity.value,
      autoExposureTarget: this.autoExposureTarget.value,
      autoContrastTarget: this.autoContrastTarget.value,
      autoWarmthTarget: this.autoWarmthTarget.value,
      autoSaturationTarget: this.autoSaturationTarget.value,
    };
  }

  // Stores analysed targets and sets intensity to `initialIntensity` (0–100).
  // Does not touch manual slider values — the blend formula in the shader hooks
  // combines them non-destructively: V_final = V_manual + (V_target - V_neutral) * intensity.
  applyAutoTargets(targets: AutoTargets, initialIntensity = 50) {
    this.autoExposureTarget.value = targets.exposure;
    this.autoContrastTarget.value = targets.contrast;
    this.autoWarmthTarget.value = targets.warmth;
    this.autoSaturationTarget.value = targets.saturation;
    this.autoIntensityRaw.value = initialIntensity;
    this.autoIntensity.value = initialIntensity / 100;
  }

  // --- Core Processing Logic ---

  private calculateMatrix(state: EditorState) {
    const R_LUM = 0.2126;
    const G_LUM = 0.7152;
    const B_LUM = 0.0722;

    const ai = state.autoIntensity;
    const exposureBlended =
      state.exposure + (state.autoExposureTarget - 1.0) * ai;
    const contrastBlended =
      state.contrast + (state.autoContrastTarget - 1.0) * ai;
    const saturationBlended =
      state.saturation + (state.autoSaturationTarget - 1.0) * ai;
    const warmthBlended = state.warmth + state.autoWarmthTarget * ai;

    const exp = Math.pow(2, exposureBlended - 1);
    const c = contrastBlended;
    const b = state.brightness - 1;
    const s = saturationBlended;
    const w = warmthBlended;
    const tnt = state.tint;
    const bp = state.blackPoint;

    const t = 1.0 - s;
    const rS = t * R_LUM;
    const gS = t * G_LUM;
    const bS = t * B_LUM;

    const rG = exp * c * (1 + w);
    const gG = exp * c * (1 + tnt);
    const bG = exp * c * (1 - w);

    const off = (1 - c) * 0.5 + b - bp * 0.5;

    return [
      rG * (rS + s),
      rG * gS,
      rG * bS,
      0,
      off,
      gG * rS,
      gG * (gS + s),
      gG * bS,
      0,
      off,
      bG * rS,
      bG * gS,
      bG * (bS + s),
      0,
      off,
      0,
      0,
      0,
      1,
      0,
    ];
  }

  // Internal helper to render the current state onto a surface.
  // Used by both generateFinalImage (for export) and commitAll (for baking).
  private renderToSurface() {
    const state = this.getState();
    const image = this.originalImage;

    const exportW = state.cropRect
      ? Math.round(state.cropRect.width)
      : image.width();
    const exportH = state.cropRect
      ? Math.round(state.cropRect.height)
      : image.height();

    const surface = Skia.Surface.Make(exportW, exportH);
    if (!surface) return null;
    const canvas = surface.getCanvas();

    // Pack uniforms in the order they appear in MASTER_SKSL:
    // vibrance, shadows, highlights, brilliance, vignette, sharpness, definition, noiseReduction, canvasSize[2]
    const uniforms = [
      state.vibrance - 1.0,
      state.shadows,
      state.highlights,
      state.brilliance,
      state.vignette,
      state.sharpness,
      state.definition,
      state.noiseReduction,
      image.width(),
      image.height(),
    ];

    const imageShader = image.makeShaderOptions(
      TileMode.Clamp,
      TileMode.Clamp,
      FilterMode.Linear,
      MipmapMode.None,
    );

    const paint = Skia.Paint();
    // Identified from types: use makeShaderWithChildren for input textures
    const paintShader = masterShaderEffect.makeShaderWithChildren(uniforms, [imageShader]);
    paint.setShader(paintShader);
    paint.setColorFilter(
      Skia.ColorFilter.MakeMatrix(this.calculateMatrix(state)),
    );

    canvas.save();

    if (state.cropRect) {
      canvas.translate(-state.cropRect.x, -state.cropRect.y);
    }

    canvas.translate(image.width() / 2, image.height() / 2);
    canvas.rotate(state.rotation, 0, 0);
    canvas.scale(state.flipX, 1);
    canvas.translate(-image.width() / 2, -image.height() / 2);

    canvas.drawImage(image, 0, 0, paint);

    canvas.save();
    canvas.scale(image.width(), image.height());

    const pathPaint = Skia.Paint();
    pathPaint.setStyle(PaintStyle.Stroke);
    pathPaint.setStrokeCap(StrokeCap.Round);
    pathPaint.setStrokeJoin(StrokeJoin.Round);

    state.paths.forEach((p) => {
      pathPaint.setColor(Skia.Color(p.color));
      pathPaint.setStrokeWidth(p.width / SCREEN_WIDTH);
      canvas.drawPath(p.path, pathPaint);
    });
    canvas.restore();
    canvas.restore();

    return surface;
  }

  generateFinalImage(): string | null {
    const surface = this.renderToSurface();
    if (!surface) return null;

    const finalImageSnapshot = surface.makeImageSnapshot();
    const base64Data = finalImageSnapshot.encodeToBase64(ImageFormat.JPEG, 90);

    return `data:image/jpeg;base64,${base64Data}`;
  }

  // Bakes all current adjustments, filters, markup and geometry into the original image.
  // Resets all state manager values back to neutral/defaults after committing.
  // This allows the user to continue editing on top of the newly processed "base" image.
  commitAll(): void {
    const surface = this.renderToSurface();
    if (!surface) return;

    this.originalImage = surface.makeImageSnapshot();

    // Reset all parameters to neutral
    this.exposure.value = 1.0;
    this.brilliance.value = 0.0;
    this.highlights.value = 0.0;
    this.shadows.value = 0.0;
    this.contrast.value = 1.0;
    this.brightness.value = 1.0;
    this.blackPoint.value = 0.0;
    this.saturation.value = 1.0;
    this.vibrance.value = 1.0;
    this.warmth.value = 0.0;
    this.tint.value = 0.0;
    this.sharpness.value = 0.0;
    this.definition.value = 0.0;
    this.noiseReduction.value = 0.0;
    this.vignette.value = 0.0;

    this.exposureRaw.value = 0;
    this.brillianceRaw.value = 0;
    this.highlightsRaw.value = 0;
    this.shadowsRaw.value = 0;
    this.contrastRaw.value = 0;
    this.brightnessRaw.value = 0;
    this.blackPointRaw.value = 0;
    this.saturationRaw.value = 0;
    this.vibranceRaw.value = 0;
    this.warmthRaw.value = 0;
    this.tintRaw.value = 0;
    this.sharpnessRaw.value = 0;
    this.definitionRaw.value = 0;
    this.noiseReductionRaw.value = 0;
    this.vignetteRaw.value = 0;

    this.autoIntensity.value = 0;
    this.autoIntensityRaw.value = 0;

    this.rotation.value = 0;
    this.flipX.value = 1;
    this.cropRect.value = null;
    this.paths.value = [];
  }
}
