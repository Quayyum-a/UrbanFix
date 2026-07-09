import * as ImageManipulator from 'expo-image-manipulator'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageOptimizationOptions {
  /** Maximum width in pixels. Defaults to 1200. */
  maxWidth?: number
  /** Maximum height in pixels. Defaults to 1200. */
  maxHeight?: number
  /**
   * Compression quality from 0 to 1. Defaults to 0.8.
   * Only applies to 'jpeg' format.
   */
  quality?: number
  /** Output format. Defaults to 'jpeg'. */
  format?: 'jpeg' | 'png'
}

export interface ImageResult {
  uri: string
  width: number
  height: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the scaled dimensions that fit within maxWidth × maxHeight
 * while preserving the original aspect ratio.
 */
function computeScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight }
  }

  const widthRatio = maxWidth / srcWidth
  const heightRatio = maxHeight / srcHeight
  const scale = Math.min(widthRatio, heightRatio)

  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compress and resize an image using expo-image-manipulator.
 *
 * Requirements: 12.1
 *
 * @param uri - Local or remote image URI
 * @param options - Compression and resize options
 * @returns Resolved URI with final dimensions
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<ImageResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg',
  } = options

  // First get current dimensions by running a no-op manipulation
  const info = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format:
      format === 'jpeg'
        ? ImageManipulator.SaveFormat.JPEG
        : ImageManipulator.SaveFormat.PNG,
  })

  const { width: scaledWidth, height: scaledHeight } = computeScaledDimensions(
    info.width,
    info.height,
    maxWidth,
    maxHeight
  )

  const actions: ImageManipulator.Action[] = []

  // Only resize if dimensions changed
  if (scaledWidth !== info.width || scaledHeight !== info.height) {
    actions.push({ resize: { width: scaledWidth, height: scaledHeight } })
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format:
      format === 'jpeg'
        ? ImageManipulator.SaveFormat.JPEG
        : ImageManipulator.SaveFormat.PNG,
  })

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  }
}

/**
 * Resize an image to fit within maxWidth × maxHeight, preserving aspect ratio.
 *
 * Requirements: 12.1
 *
 * @param uri - Local or remote image URI
 * @param maxWidth - Maximum output width in pixels
 * @param maxHeight - Maximum output height in pixels
 * @returns Resolved URI with final dimensions
 */
export async function resizeImage(
  uri: string,
  maxWidth: number,
  maxHeight: number
): Promise<ImageResult> {
  return optimizeImage(uri, { maxWidth, maxHeight, quality: 1, format: 'jpeg' })
}

/**
 * Rough estimate of JPEG file size in bytes for a given resolution and quality.
 *
 * The formula uses an empirical constant (0.06 bytes/pixel at quality 1.0)
 * scaled linearly by quality.
 *
 * Requirements: 12.1
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param quality - Compression quality 0-1
 * @returns Estimated size in bytes
 */
export function estimateCompressedSize(
  width: number,
  height: number,
  quality: number
): number {
  const clampedQuality = Math.max(0, Math.min(1, quality))
  const bytesPerPixel = 0.06 * clampedQuality
  return Math.round(width * height * bytesPerPixel)
}
