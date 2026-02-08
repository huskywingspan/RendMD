import { describe, it, expect, vi } from 'vitest';

// escapeHTML is not exported directly, so we test it indirectly via exportAsHTML
// We can access it by importing the module and testing the HTML output

// For the private escapeHTML function, we test via the exported exportAsHTML output
// But since exportAsHTML needs a full TipTap editor and DOM, we test what we can.

// We'll re-implement the test by importing the module and spying on internals,
// or we test escapeHTML behavior through the HTML export output.

// Actually, let's test via indirect approach: the escapeHTML function is used in
// the <title> tag of exportAsHTML output. We can create a minimal mock editor.

describe('exportHelpers', () => {
  describe('escapeHTML (via exportAsHTML)', () => {
    it('escapes HTML entities in the title', async () => {
      // Dynamic import to allow mocking
      const { exportAsHTML } = await import('../exportHelpers');

      // Mock editor
      const mockEditor = {
        getHTML: () => '<p>Test content</p>',
      };

      // Mock DOM APIs needed by captureThemeVariables
      vi.stubGlobal('getComputedStyle', () => ({
        getPropertyValue: () => '',
      }));

      // Mock document.styleSheets
      Object.defineProperty(document, 'styleSheets', {
        value: [],
        configurable: true,
      });

      // Capture what downloadFile receives by mocking URL and DOM
      let capturedContent = '';
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      // Override Blob to capture content
      const OriginalBlob = globalThis.Blob;
      vi.stubGlobal('Blob', class MockBlob extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          if (typeof parts[0] === 'string') {
            capturedContent = parts[0];
          }
        }
      });

      exportAsHTML(mockEditor as never, '<script>alert("xss")</script>.md');

      // The title should have escaped HTML entities
      expect(capturedContent).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(capturedContent).toContain('<!DOCTYPE html>');
      expect(capturedContent).toContain('<p>Test content</p>');

      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });
  });

  describe('exportAsPDF', () => {
    it('calls window.print()', async () => {
      const { exportAsPDF } = await import('../exportHelpers');
      const printSpy = vi.fn();
      vi.stubGlobal('print', printSpy);

      exportAsPDF();

      expect(printSpy).toHaveBeenCalledOnce();

      vi.unstubAllGlobals();
    });
  });
});
