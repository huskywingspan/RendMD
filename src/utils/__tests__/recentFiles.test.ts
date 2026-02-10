import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval — must be first so the module factory runs before import
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

import {
  formatRelativeTime,
  storeFileHandle,
  getFileHandle,
  removeFileHandle,
  MAX_RECENT,
} from '../recentFiles';
import { get, set, del } from 'idb-keyval';

describe('recentFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MAX_RECENT', () => {
    it('is 8', () => {
      expect(MAX_RECENT).toBe(8);
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for timestamps < 60s ago', () => {
      expect(formatRelativeTime(Date.now() - 30_000)).toBe('just now');
    });

    it('returns minutes ago', () => {
      expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe('5 minutes ago');
    });

    it('returns singular minute', () => {
      expect(formatRelativeTime(Date.now() - 60_000)).toBe('1 minute ago');
    });

    it('returns hours ago', () => {
      expect(formatRelativeTime(Date.now() - 3 * 3_600_000)).toBe('3 hours ago');
    });

    it('returns singular hour', () => {
      expect(formatRelativeTime(Date.now() - 3_600_000)).toBe('1 hour ago');
    });

    it('returns "yesterday" for 1 day ago', () => {
      expect(formatRelativeTime(Date.now() - 86_400_000)).toBe('yesterday');
    });

    it('returns days ago for 2-6 days', () => {
      expect(formatRelativeTime(Date.now() - 3 * 86_400_000)).toBe('3 days ago');
    });

    it('returns weeks ago for 7-29 days', () => {
      expect(formatRelativeTime(Date.now() - 14 * 86_400_000)).toBe('2 weeks ago');
    });

    it('returns a date string for 30+ days', () => {
      const old = Date.now() - 45 * 86_400_000;
      const result = formatRelativeTime(old);
      // Should be a locale date string, not relative
      expect(result).not.toContain('ago');
      expect(result).not.toContain('just now');
    });
  });

  describe('storeFileHandle', () => {
    it('stores a handle and returns the key', async () => {
      const mockHandle = {} as FileSystemFileHandle;
      const key = await storeFileHandle('test.md', mockHandle);
      expect(key).toBe('rendmd-handle-test.md');
      expect(set).toHaveBeenCalledWith('rendmd-handle-test.md', mockHandle);
    });

    it('handles storage errors gracefully', async () => {
      vi.mocked(set).mockRejectedValueOnce(new Error('quota'));
      const key = await storeFileHandle('test.md', {} as FileSystemFileHandle);
      expect(key).toBe('rendmd-handle-test.md');
    });
  });

  describe('getFileHandle', () => {
    it('returns handle when found', async () => {
      const mockHandle = { name: 'test.md' } as FileSystemFileHandle;
      vi.mocked(get).mockResolvedValueOnce(mockHandle);
      const result = await getFileHandle('rendmd-handle-test.md');
      expect(result).toBe(mockHandle);
    });

    it('returns null when not found', async () => {
      vi.mocked(get).mockResolvedValueOnce(undefined);
      const result = await getFileHandle('rendmd-handle-missing.md');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      vi.mocked(get).mockRejectedValueOnce(new Error('db error'));
      const result = await getFileHandle('rendmd-handle-test.md');
      expect(result).toBeNull();
    });
  });

  describe('removeFileHandle', () => {
    it('calls del with the key', async () => {
      await removeFileHandle('rendmd-handle-test.md');
      expect(del).toHaveBeenCalledWith('rendmd-handle-test.md');
    });

    it('does not throw on error', async () => {
      vi.mocked(del).mockRejectedValueOnce(new Error('fail'));
      await expect(removeFileHandle('key')).resolves.toBeUndefined();
    });
  });
});
