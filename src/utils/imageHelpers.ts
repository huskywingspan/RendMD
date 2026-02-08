/** Supported image MIME types for upload/paste */
export const SUPPORTED_IMAGE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** File size threshold (5MB) above which a warning should be shown */
export const IMAGE_SIZE_WARNING_THRESHOLD: number = 5 * 1024 * 1024;

/**
 * Convert a File to a base64-encoded data URL string.
 *
 * @param file - The file to convert
 * @returns A promise that resolves to the base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string result'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitize a filename for safe filesystem use.
 *
 * Removes special characters, replaces spaces with hyphens,
 * lowercases the result, and trims to 50 characters max.
 *
 * @param name - The raw filename to sanitize
 * @returns A filesystem-safe filename string
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);
}

/**
 * Generate a unique filename for an image file.
 *
 * Uses {@link sanitizeFilename} on the base name (without extension),
 * appends a timestamp, then the original extension. For generic clipboard
 * paste filenames (e.g. "image.png"), uses "screenshot" as the base name.
 *
 * @param file - The image file to generate a name for
 * @returns A unique, sanitized filename with extension
 */
export function generateImageFilename(file: File): string {
  const lastDot = file.name.lastIndexOf('.');
  const extension = lastDot !== -1 ? file.name.slice(lastDot) : '';
  const rawBase = lastDot !== -1 ? file.name.slice(0, lastDot) : file.name;

  const genericNames = ['image', 'clipboard', 'paste', 'screenshot', 'blob'];
  const isGeneric = genericNames.includes(rawBase.toLowerCase());
  const baseName = isGeneric ? 'screenshot' : sanitizeFilename(rawBase);

  const timestamp = Date.now();

  return `${baseName}-${timestamp}${extension.toLowerCase()}`;
}

/**
 * Check whether a File is an image based on its MIME type.
 *
 * @param file - The file to check
 * @returns `true` if the file's type is a supported image MIME type
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Format a byte count into a human-readable size string.
 *
 * @param bytes - The number of bytes
 * @returns A formatted string such as "1.5 MB" or "832 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${parseFloat(value.toFixed(2))} ${units[unitIndex]}`;
}
