/**
 * Client-Side Image Compression Utility
 * Prevents massive payload transfer errors, network timeouts, and proxy 413s
 * by resizing and compressing camera/phone photos to web-optimized dimensions.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.85 } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      // In case image decoding or canvas is unavailable in this environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return resolve(rawDataUrl);
      }

      const img = new Image();

      img.onerror = () => {
        // Fallback to raw data url if decode fails (e.g. svg or custom format)
        resolve(rawDataUrl);
      };

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            return resolve(rawDataUrl);
          }

          // Calculate scaled bounds
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(rawDataUrl);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Use PNG if original has transparency, otherwise JPEG for high compression
          const isPng = file.type === 'image/png';
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(mimeType, isPng ? undefined : quality);

          resolve(compressed);
        } catch {
          // If canvas security or memory exception occurs, fall back to raw data URL
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
