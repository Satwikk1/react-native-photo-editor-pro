import { Skia, SkImage, SkPath, PaintStyle } from "@shopify/react-native-skia";
import { Dimensions } from "react-native";
import { makeMutable, SharedValue } from "react-native-reanimated";

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
  brightness: number;
  contrast: number;
  saturation: number;
  paths: DrawingPath[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export class EditorStateManager {
  public brightness: SharedValue<number>;
  public contrast: SharedValue<number>;
  public saturation: SharedValue<number>;
  public rotation: SharedValue<number>;
  public flipX: SharedValue<number>;
  public cropRect: SharedValue<CropRect | null>;
  public paths: SharedValue<DrawingPath[]>;
  public readonly originalImage: SkImage;

  constructor(image: SkImage) {
    this.originalImage = image;
    this.brightness = makeMutable(1);
    this.contrast = makeMutable(1);
    this.saturation = makeMutable(1);
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

  setAdjustments(b: number, c: number, s: number) {
    this.brightness.value = b;
    this.contrast.value = c;
    this.saturation.value = s;
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
      brightness: this.brightness.value,
      contrast: this.contrast.value,
      saturation: this.saturation.value,
      paths: [...this.paths.value],
    };
  }

  // --- Core Processing Logic ---

  /**
   * Generates the final edited image based on the accumulated state.
   */
  generateFinalImage(): string | null {
    const { cropRect, rotation, flipX, brightness, contrast, saturation, paths } = this.getState();
    const image = this.originalImage;

    const surface = Skia.Surface.Make(image.width(), image.height());
    if (!surface) return null;
    const canvas = surface.getCanvas();

    // 1. Apply Adjustments (Color Matrix)
    const paint = Skia.Paint();
    const b = brightness;
    const c = contrast;
    const s = saturation;
    const t = (1 - c) / 2;
    const lumR = 0.213, lumG = 0.715, lumB = 0.072;

    const matrix = [
      c * ((1 - s) * lumR + s), c * ((1 - s) * lumG), c * ((1 - s) * lumB), 0, t + (b - 1),
      c * ((1 - s) * lumR), c * ((1 - s) * lumG + s), c * ((1 - s) * lumB), 0, t + (b - 1),
      c * ((1 - s) * lumR), c * ((1 - s) * lumG), c * ((1 - s) * lumB + s), 0, t + (b - 1),
      0, 0, 0, 1, 0,
    ];
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));

    // 2. Apply Transforms (Rotate/Flip)
    canvas.save();
    canvas.translate(image.width() / 2, image.height() / 2);
    canvas.rotate(rotation, 0, 0);
    canvas.scale(flipX, 1);
    canvas.translate(-image.width() / 2, -image.height() / 2);

    canvas.drawImage(image, 0, 0, paint);

    // 3. Draw Markup (Paths)
    const imgWidth = SCREEN_WIDTH;
    const imgHeight = SCREEN_WIDTH * (image.height() / image.width());
    const EDITOR_HEIGHT = Dimensions.get("window").height * 0.7; // Standard editor height
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

    // 4. Apply Crop
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
