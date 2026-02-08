import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeFilename,
  generateImageFilename,
  isImageFile,
  formatFileSize,
  SUPPORTED_IMAGE_TYPES,
  IMAGE_SIZE_WARNING_THRESHOLD,
} from '../imageHelpers';

/** Helper to create a mock File */
function createMockFile(name: string, type: string, size = 1024): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe('sanitizeFilename', () => {
  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('hello world')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(sanitizeFilename('file@name#test!')).toBe('filenametest');
  });

  it('lowercases the result', () => {
    expect(sanitizeFilename('MyPhoto')).toBe('myphoto');
  });

  it('preserves hyphens and underscores', () => {
    expect(sanitizeFilename('my-file_name')).toBe('my-file_name');
  });

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeFilename(long).length).toBe(50);
  });

  it('handles empty string', () => {
    expect(sanitizeFilename('')).toBe('');
  });

  it('collapses multiple spaces into single hyphen', () => {
    expect(sanitizeFilename('hello   world')).toBe('hello-world');
  });
});

describe('generateImageFilename', () => {
  it('produces a filename with timestamp', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const file = createMockFile('photo.png', 'image/png');
    const result = generateImageFilename(file);

    expect(result).toContain(`-${now}`);
    expect(result).toMatch(/\.png$/);

    vi.restoreAllMocks();
  });

  it('uses "screenshot" base for generic clipboard names', () => {
    const file = createMockFile('image.png', 'image/png');
    const result = generateImageFilename(file);

    expect(result).toMatch(/^screenshot-\d+\.png$/);
  });

  it('sanitizes custom filenames', () => {
    const file = createMockFile('My Photo@2024.jpg', 'image/jpeg');
    const result = generateImageFilename(file);

    expect(result).toMatch(/^my-photo2024-\d+\.jpg$/);
  });

  it('lowercases the extension', () => {
    const file = createMockFile('test.PNG', 'image/png');
    const result = generateImageFilename(file);

    expect(result).toMatch(/\.png$/);
  });
});

describe('isImageFile', () => {
  it('returns true for supported image types', () => {
    expect(isImageFile(createMockFile('a.png', 'image/png'))).toBe(true);
    expect(isImageFile(createMockFile('b.jpg', 'image/jpeg'))).toBe(true);
    expect(isImageFile(createMockFile('c.gif', 'image/gif'))).toBe(true);
    expect(isImageFile(createMockFile('d.webp', 'image/webp'))).toBe(true);
    expect(isImageFile(createMockFile('e.svg', 'image/svg+xml'))).toBe(true);
  });

  it('returns false for non-image types', () => {
    expect(isImageFile(createMockFile('a.txt', 'text/plain'))).toBe(false);
    expect(isImageFile(createMockFile('b.pdf', 'application/pdf'))).toBe(false);
    expect(isImageFile(createMockFile('c.zip', 'application/zip'))).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('constants', () => {
  it('SUPPORTED_IMAGE_TYPES includes common image MIME types', () => {
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/png');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/gif');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/webp');
    expect(SUPPORTED_IMAGE_TYPES).toContain('image/svg+xml');
  });

  it('IMAGE_SIZE_WARNING_THRESHOLD is 5MB', () => {
    expect(IMAGE_SIZE_WARNING_THRESHOLD).toBe(5 * 1024 * 1024);
  });
});
