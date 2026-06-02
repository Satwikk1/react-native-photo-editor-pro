import { Skia, SkImage } from '@shopify/react-native-skia';
import { getFilterMatrix, FilterType } from './filters';
import { convertSkImage } from './convert';

export const exportProcessedImage = async (
  originalImage: SkImage,
  filter: FilterType,
  cropRect?: { x: number; y: number; width: number; height: number },
  rotationAngle: number = 0,
  format: 'png' | 'jpeg' | 'webp' = 'webp',
  quality: number = 90
): Promise<string | null> => {
  try {
    const width = originalImage.width();
    const height = originalImage.height();

    // 1. Create Offscreen Surface
    const surface = Skia.Surface.Make(width, height);
    if (!surface) return null;
    const canvas = surface.getCanvas();

    // 2. Prepare Paint with Filters
    const paint = Skia.Paint();
    if (filter !== 'normal') {
      const colorFilter = Skia.ImageFilter.MakeColorFilter(
        Skia.ColorFilter.MakeMatrix(getFilterMatrix(filter)),
        null
      );
      paint.setImageFilter(colorFilter);
    }

    // 3. Handle Rotation (Smart Tilt)
    if (rotationAngle !== 0) {
      canvas.save();
      canvas.translate(width / 2, height / 2);
      canvas.rotate(rotationAngle, 0, 0); 
      canvas.translate(-width / 2, -height / 2);
    }

    // 4. Draw Image
    canvas.drawImage(originalImage, 0, 0, paint);
    
    if (rotationAngle !== 0) {
       canvas.restore();
    }

    let finalImage = surface.makeImageSnapshot();

    // 5. Apply Pixel Cut (Cropping) using a new Surface
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

    // 6. Encode and return as Data URI
    return convertSkImage(finalImage, format, quality);
  } catch (error) {
    console.error("Export failed:", error);
    return null;
  }
};
