// src/utils/convert.ts
import { Image } from "react-native";
import { SkImage, ImageFormat } from "@shopify/react-native-skia";

/**
 * Validates whether the given URI or asset reference is in a supported image format.
 * Supported formats: PNG, JPEG/JPG, and WEBP.
 * Supported URIs:
 * - Remote HTTP/HTTPS URLs (e.g. "https://example.com/photo.jpg")
 * - Local filesystem paths (e.g. "file:///path/to/image.png")
 * - Local bundle resources / requires (e.g. 1 (a number))
 * - Base64 Data URIs (e.g. "data:image/webp;base64,...")
 */
export const isSupportedFormat = (uri: string | number): boolean => {
  let resolvedUri = "";

  if (typeof uri === "number") {
    try {
      const asset = Image.resolveAssetSource(uri);
      resolvedUri = asset?.uri || "";
    } catch (e) {
      console.warn("Failed to resolve asset require:", e);
      return false;
    }
  } else {
    resolvedUri = uri;
  }

  if (!resolvedUri) return false;

  // 1. Validate Base64 Data URIs
  if (resolvedUri.startsWith("data:")) {
    // Format: data:image/png;base64,... or data:image/webp;base64,...
    const match = resolvedUri.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
    return !!match;
  }

  // 2. Extract extension from path (strip query parameters/hash fragment)
  const cleanPath = resolvedUri.split("?")[0].split("#")[0];
  const lastSegment = cleanPath.split("/").pop() || "";
  const parts = lastSegment.split(".");
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : "";

  // If there is no extension (e.g. "https://picsum.photos/800/1200"), we allow it
  // because remote servers negotiate supported formats (e.g. JPEG/PNG) dynamically.
  if (!extension) {
    return true;
  }

  // 3. Check against explicit lists
  const forbiddenExtensions = ["gif", "bmp", "tiff", "tif", "heic", "heif"];
  const supportedExtensions = ["png", "jpg", "jpeg", "webp"];

  if (forbiddenExtensions.includes(extension)) {
    return false;
  }

  if (supportedExtensions.includes(extension)) {
    return true;
  }

  // For any other extension: if it's a remote URL, allow it to try loading
  if (resolvedUri.startsWith("http://") || resolvedUri.startsWith("https://")) {
    return true;
  }

  return false;
};

/**
 * Converts a SkImage to a base64 Data URI with the chosen format and quality.
 * Default format is WEBP, default quality is 90.
 */
export const convertSkImage = (
  image: SkImage,
  format: "png" | "jpeg" | "webp" = "png",
  quality: number = 100
): string | null => {
  try {
    let skiaFormat = ImageFormat.WEBP;
    let mimeType = "image/webp";

    const normalizedFormat = format.toLowerCase();

    if (normalizedFormat === "png") {
      skiaFormat = ImageFormat.PNG;
      mimeType = "image/png";
    } else if (normalizedFormat === "jpeg" || normalizedFormat === "jpg") {
      skiaFormat = ImageFormat.JPEG;
      mimeType = "image/jpeg";
    }

    const base64Data = image.encodeToBase64(skiaFormat, quality);
    if (!base64Data) return null;

    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error("convertSkImage failed:", error);
    return null;
  }
};

/**
 * Safe helper to add an alpha channel to shorthand 3-digit hex (#FFF) 
 * or 6-digit hex (#FFFFFF) colors, preventing rendering bugs in React Native/Skia.
 */
export const addAlpha = (color: string, alphaHex: string): string => {
  if (!color || !color.startsWith("#")) return color;
  let hex = color;
  if (color.length === 4) {
    hex = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  if (hex.length === 9) {
    return hex.substring(0, 7) + alphaHex;
  }
  return hex + alphaHex;
};
