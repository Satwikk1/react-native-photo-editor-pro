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
import { masterShaderEffect, filterMatrixEffect } from "../components/adjustments/constants";
import { Dimensions } from "react-native";
import { makeMutable, SharedValue } from "react-native-reanimated";
import type { AutoTargets } from "../components/adjustments/autoEnhance";
import { convertSkImage } from "../utils/convert";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  filterMatrix: number[] | null;
  filterIntensity: number;
  filterId: string | null;
  straighten: number;
  pitch: number;
  yaw: number;
}



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

  // Filter State
  public filterMatrix: SharedValue<number[] | null>;
  public filterIntensity: SharedValue<number>;
  public filterEffect: SharedValue<any | null>; // Using any to avoid complex Skia types in mutable
  public filterId: SharedValue<string | null>;

  public rotation: SharedValue<number>;
  public straighten: SharedValue<number>;
  public pitch: SharedValue<number>;
  public yaw: SharedValue<number>;
  public flipX: SharedValue<number>;
  public cropRect: SharedValue<CropRect | null>;
  public paths: SharedValue<DrawingPath[]>;
  public originalImage: SkImage;
  private readonly initialImage: SkImage;

  constructor(image: SkImage) {
    this.originalImage = image;
    this.initialImage = image;

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

    this.filterMatrix = makeMutable<number[] | null>(null);
    this.filterIntensity = makeMutable(100);
    this.filterEffect = makeMutable<any | null>(null);
    this.filterId = makeMutable<string | null>("original");

    this.rotation = makeMutable(0);
    this.straighten = makeMutable(0);
    this.pitch = makeMutable(0);
    this.yaw = makeMutable(0);
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
  public setFilter(id: string, matrix: number[] | null, effect: any | null, intensity: number) {
    this.filterId.value = id;
    this.filterMatrix.value = matrix;
    this.filterEffect.value = effect;
    this.filterIntensity.value = intensity;
  }

  public setFilterIntensity(intensity: number) {
    this.filterIntensity.value = intensity;
  }

  public resetAll() {
    this.originalImage = this.initialImage;

    // Reset processing values
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

    // Reset raw values
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

    // Reset auto-enhance values
    this.autoIntensity.value = 0;
    this.autoIntensityRaw.value = 0;
    this.autoExposureTarget.value = 1.0;
    this.autoContrastTarget.value = 1.0;
    this.autoWarmthTarget.value = 0.0;
    this.autoSaturationTarget.value = 1.0;

    // Reset filter values
    this.filterId.value = "original";
    this.filterMatrix.value = null;
    this.filterIntensity.value = 100;
    this.filterEffect.value = null;

    // Reset crop and transformation values
    this.rotation.value = 0;
    this.straighten.value = 0;
    this.pitch.value = 0;
    this.yaw.value = 0;
    this.flipX.value = 1;
    this.cropRect.value = null;

    // Clear drawings
    this.paths.value = [];
  }

  private blendFilterMatrix(matrix: number[], t: number): number[] {
    const id = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const out: number[] = [];
    const alpha = t / 100;
    for (let i = 0; i < matrix.length; i++) {
      out.push(id[i] + (matrix[i] - id[i]) * alpha);
    }
    return out;
  }

  // Bakes rotation + flip + perspective + crop into a new originalImage.
  // pitch/yaw in radians. Resets all geometric state after.
  commitCrop(): void {
    const img = this.originalImage;
    const rot = this.rotation.value + this.straighten.value;
    const pitch = this.pitch.value * Math.PI / 180;
    const yaw = this.yaw.value * Math.PI / 180;
    const fx = this.flipX.value;
    const cr = this.cropRect.value;
    const w = img.width(),
      h = img.height();
    const cx = w / 2,
      cy = h / 2;

    // Perspective distance scaled to image pixel space.
    const d = 700 * (w / SCREEN_WIDTH);

    // Auto-scale — same formula as the UI worklet so no black corners.
    const θ = (rot * Math.PI) / 180;
    const cosT = Math.cos(Math.abs(θ));
    const sinT = Math.sin(Math.abs(θ));
    const straightenScale = Math.max(
      (w * cosT + h * sinT) / w,
      (w * sinT + h * cosT) / h,
    );
    const pitchScale = Math.abs(pitch) > 0.001 ? 1 / Math.cos(Math.abs(pitch)) : 1;
    const yawScale   = Math.abs(yaw)   > 0.001 ? 1 / Math.cos(Math.abs(yaw))   : 1;
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
    this.straighten.value = 0;
    this.pitch.value = 0;
    this.yaw.value = 0;
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
      filterMatrix: this.filterMatrix.value,
      filterIntensity: this.filterIntensity.value,
      filterId: this.filterId.value,
      straighten: this.straighten.value,
      pitch: this.pitch.value,
      yaw: this.yaw.value,
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

    let step = "Initialize Surface";
    try {
      const surface = Skia.Surface.Make(exportW, exportH);
      if (!surface) return null;
      const canvas = surface.getCanvas();

      step = "Prepare Matrix";

    // 1. Prepare Uniforms
    const matrix = this.calculateMatrix(state);
    const m4x4 = [
      matrix[0], matrix[1], matrix[2], matrix[3],
      matrix[5], matrix[6], matrix[7], matrix[8],
      matrix[10], matrix[11], matrix[12], matrix[13],
      matrix[15], matrix[16], matrix[17], matrix[18],
    ];
    const offset = [matrix[4], matrix[9], matrix[14], matrix[19]];
    
    const uniforms = [
      ...m4x4, // 16
      ...offset, // 4
      state.vibrance - 1.0, // 1
      state.shadows, // 1
      state.highlights, // 1
      state.brilliance, // 1
      state.vignette, // 1
      state.sharpness, // 1
      state.definition, // 1
      state.noiseReduction, // 1
      exportW, // 1
      exportH, // 1
    ];

    // 2. Build Filter Chain
    step = "Make Image Shader";
    const rawImageShader = image.makeShaderOptions 
      ? image.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None)
      : (image as any).makeShader(TileMode.Clamp, TileMode.Clamp);

    if (!rawImageShader) {
      throw new Error("Failed to create raw image shader");
    }

    // 2b. Apply Preset Filter
    step = "Apply Preset Filter";
    let filterShader = rawImageShader;
    if (state.filterId && state.filterId !== "original") {
      if (state.filterMatrix) {
        // Use the dedicated Matrix Filter Shader
        const finalFM = this.blendFilterMatrix(state.filterMatrix, state.filterIntensity);
        filterShader = filterMatrixEffect.makeShaderWithChildren(
          [
            finalFM[0], finalFM[1], finalFM[2], finalFM[3],
            finalFM[5], finalFM[6], finalFM[7], finalFM[8],
            finalFM[10], finalFM[11], finalFM[12], finalFM[13],
            finalFM[15], finalFM[16], finalFM[17], finalFM[18],
            finalFM[4], finalFM[9], finalFM[14], finalFM[19],
          ],
          [filterShader]
        );
      } else if (this.filterEffect.value) {
        // RuntimeShader Filter (e.g. Teal & Orange)
        filterShader = this.filterEffect.value.makeShader(
          { intensity: state.filterIntensity / 100 },
          [filterShader]
        );
      }
    }

    step = "Make Master Shader";
    const finalShader = masterShaderEffect.makeShaderWithChildren(uniforms, [
      filterShader,
    ]);


    if (!finalShader) {
      throw new Error("Failed to create master shader");
    }

    step = "Setup Paint";
    const paint = Skia.Paint();
    paint.setShader(finalShader);

    step = "Draw Base Image";

    // 3. Render Image with Geometry
    canvas.save();

    const w = image.width();
    const h = image.height();
    const cx = w / 2;
    const cy = h / 2;

    // Move surface origin to the top-left of the crop rect if present
    if (state.cropRect) {
      canvas.translate(-state.cropRect.x, -state.cropRect.y);
    }

    // 3b. Calculate Geometric Transforms & Auto-Scale
    // We must scale the image so that after rotation/perspective it still fills the canvas.
    const totalRotation = (state.rotation || 0) + (this.straighten.value || 0);
    const θ = (totalRotation * Math.PI) / 180;
    const p = (this.pitch.value || 0) * Math.PI / 180;
    const y = (this.yaw.value || 0) * Math.PI / 180;

    const cosT = Math.cos(Math.abs(θ));
    const sinT = Math.sin(Math.abs(θ));
    
    // Straighten Scale (to avoid black corners)
    const sRot = Math.max((w * cosT + h * sinT) / w, (w * sinT + h * cosT) / h);
    // Perspective Scales
    const sPitch = Math.abs(p) > 0.001 ? 1 / Math.cos(Math.abs(p)) : 1;
    const sYaw   = Math.abs(y) > 0.001 ? 1 / Math.cos(Math.abs(y)) : 1;
    
    const s = sRot * sPitch * sYaw;
    const fx = state.flipX ?? 1;

    // Apply transforms around image center
    canvas.translate(cx, cy);
    
    // Perspective (Matching commitCrop)
    const d = 700 * (w / SCREEN_WIDTH); 
    if (Math.abs(p) > 0.001) {
      canvas.concat(Skia.Matrix([1, 0, 0, 0, Math.cos(p), 0, 0, Math.sin(p) / d, 1]));
    }
    if (Math.abs(y) > 0.001) {
      canvas.concat(Skia.Matrix([Math.cos(y), 0, 0, 0, 1, 0, Math.sin(y) / d, 0, 1]));
    }

    canvas.rotate(totalRotation, 0, 0);
    canvas.scale(fx * s, s);
    canvas.translate(-cx, -cy);

    canvas.drawPaint(paint);
    canvas.restore();

    // 4. Render Markup
    if (state.paths.length > 0) {
      canvas.save();
      if (state.cropRect) {
        canvas.translate(-state.cropRect.x, -state.cropRect.y);
      }
      
      // Geometry for paths must match the image geometry
      canvas.translate(image.width() / 2, image.height() / 2);
      canvas.rotate(state.rotation, 0, 0);
      canvas.scale(state.flipX, 1);
      canvas.translate(-image.width() / 2, -image.height() / 2);

      // Paths are stored in normalized 0..1 space relative to the image
      canvas.scale(image.width(), image.height());

      const pathPaint = Skia.Paint();
      pathPaint.setStyle(PaintStyle.Stroke);
      pathPaint.setStrokeCap(StrokeCap.Round);
      pathPaint.setStrokeJoin(StrokeJoin.Round);

      state.paths.forEach((p) => {
        pathPaint.setColor(Skia.Color(p.color));
        // Stroke width was designed for SCREEN_WIDTH; scale it for full-res export
        pathPaint.setStrokeWidth(p.width / SCREEN_WIDTH);
        canvas.drawPath(p.path, pathPaint);
      });
      canvas.restore();
    }

      return surface;
    } catch (e: any) {
      console.error(`Skia Rendering Error at step [${step}]:`, e);
      throw new Error(`Skia Rendering Error at step [${step}]: ${e.message}`);
    }
  }
  generateFinalImage(
    format: "png" | "jpeg" | "webp" = "webp",
    quality: number = 90
  ): string | null {
    const surface = this.renderToSurface();
    if (!surface) return null;

    const finalImageSnapshot = surface.makeImageSnapshot();
    return convertSkImage(finalImageSnapshot, format, quality);
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
