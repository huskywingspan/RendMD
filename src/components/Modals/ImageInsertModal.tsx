import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, HardDrive, Code2, AlertTriangle, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { fileToBase64, formatFileSize, IMAGE_SIZE_WARNING_THRESHOLD, isImageFile } from '@/utils/imageHelpers';

type Tab = 'url' | 'local' | 'embed';

interface ImageInsertModalProps {
  file?: File;
  onInsertUrl: (url: string, alt: string) => void;
  onInsertBase64: (dataUrl: string, alt: string) => void;
  onInsertLocal: (relativePath: string, alt: string) => void;
  onCancel: () => void;
}

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'url', label: 'URL', icon: <Link size={14} /> },
  { id: 'local', label: 'Local File', icon: <HardDrive size={14} /> },
  { id: 'embed', label: 'Embed (Base64)', icon: <Code2 size={14} /> },
];

function getDefaultTab(file: File | undefined): Tab {
  if (file) {
    return 'local';
  }
  return 'url';
}

export function ImageInsertModal({
  file,
  onInsertUrl,
  onInsertBase64,
  onInsertLocal,
  onCancel,
}: ImageInsertModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>(() => getDefaultTab(file));
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Create object URL preview for the file
  useEffect(() => {
    if (!file || !isImageFile(file)) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Pre-fill alt text and local path from filename
  useEffect(() => {
    if (file) {
      const lastDot = file.name.lastIndexOf('.');
      const name = lastDot !== -1 ? file.name.slice(0, lastDot) : file.name;
      setAlt(name);
      setLocalPath(file.name);
    }
  }, [file]);

  // Lazily convert to base64 when embed tab is selected
  useEffect(() => {
    if (activeTab !== 'embed' || !file || base64Data) return;

    let cancelled = false;
    setIsConverting(true);

    fileToBase64(file)
      .then((data) => {
        if (!cancelled) {
          setBase64Data(data);
        }
      })
      .catch(() => {
        // Conversion failed — user will see no preview
      })
      .finally(() => {
        if (!cancelled) {
          setIsConverting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, file, base64Data]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  // Focus trap + key listeners
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelectors =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTabTrap(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTabTrap);

    requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [handleKeyDown]);

  const fileSizeWarning = useMemo(() => {
    return file ? file.size > IMAGE_SIZE_WARNING_THRESHOLD : false;
  }, [file]);

  function handleInsert(): void {
    switch (activeTab) {
      case 'url':
        if (url.trim()) {
          onInsertUrl(url.trim(), alt.trim());
        }
        break;
      case 'local':
        if (localPath.trim()) {
          onInsertLocal(localPath.trim(), alt.trim());
        }
        break;
      case 'embed':
        if (base64Data) {
          onInsertBase64(base64Data, alt.trim());
        }
        break;
    }
  }

  function canInsert(): boolean {
    switch (activeTab) {
      case 'url':
        return url.trim().length > 0;
      case 'local':
        return localPath.trim().length > 0;
      case 'embed':
        return !!base64Data && !isConverting;
      default:
        return false;
    }
  }

  const inputStyles = cn(
    'w-full px-3 py-2 rounded-md text-sm',
    'bg-surface',
    'text-ink',
    'placeholder:text-ink-faint',
    'border border-line',
    'focus:outline-none focus:border-accent',
    'transition-colors'
  );

  const buttonPrimaryStyles = cn(
    'flex items-center justify-center gap-2',
    'px-4 py-2 rounded-md text-sm font-medium',
    'bg-accent text-white',
    'hover:opacity-90 transition-opacity',
    'disabled:opacity-40 disabled:cursor-not-allowed'
  );

  function renderPreviewThumbnail(): React.ReactNode {
    if (!previewUrl) return null;

    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-md',
          'bg-sunken',
          'border border-line'
        )}
      >
        <img
          src={previewUrl}
          alt="Preview"
          className="w-16 h-16 object-cover rounded border border-line"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink truncate">
            {file?.name}
          </p>
          <p className="text-xs text-ink-faint">
            {file ? formatFileSize(file.size) : ''}
          </p>
        </div>
      </div>
    );
  }

  function renderUrlTab(): React.ReactNode {
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="img-url-input" className="block text-xs font-medium text-ink-muted mb-1">
            Image URL
          </label>
          <input
            id="img-url-input"
            ref={activeTab === 'url' ? firstInputRef : undefined}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="img-url-alt" className="block text-xs font-medium text-ink-muted mb-1">
            Alt text
          </label>
          <input
            id="img-url-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image..."
            className={inputStyles}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleInsert}
            disabled={!canInsert()}
            className={buttonPrimaryStyles}
          >
            <ImageIcon size={14} />
            Insert
          </button>
        </div>
      </div>
    );
  }

  function renderLocalTab(): React.ReactNode {
    return (
      <div className="space-y-3">
        {file && renderPreviewThumbnail()}
        <div>
          <label htmlFor="img-local-path" className="block text-xs font-medium text-ink-muted mb-1">
            File path (relative to your markdown file)
          </label>
          <input
            id="img-local-path"
            ref={activeTab === 'local' ? firstInputRef : undefined}
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="image.png or assets/image.png"
            className={inputStyles}
          />
          <p className="text-xs text-ink-faint mt-1">
            The image must be accessible relative to your .md file on disk.
          </p>
        </div>
        <div>
          <label htmlFor="img-local-alt" className="block text-xs font-medium text-ink-muted mb-1">
            Alt text
          </label>
          <input
            id="img-local-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image..."
            className={inputStyles}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleInsert}
            disabled={!canInsert()}
            className={buttonPrimaryStyles}
          >
            <HardDrive size={14} />
            Insert Reference
          </button>
        </div>
      </div>
    );
  }

  function renderEmbedTab(): React.ReactNode {
    return (
      <div className="space-y-3">
        {file && renderPreviewThumbnail()}
        {!file && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ImageIcon size={32} className="text-ink-faint mb-2" />
            <p className="text-sm text-ink-faint">
              No file provided. Paste or drop an image to embed.
            </p>
          </div>
        )}
        {fileSizeWarning && (
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-md',
              'bg-yellow-500/10 border border-yellow-500/30',
              'text-yellow-600 dark:text-yellow-400'
            )}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs">
              This image is over {formatFileSize(IMAGE_SIZE_WARNING_THRESHOLD)}.
              Embedding large files as base64 will significantly increase your
              document size. Consider using the URL or Local File option instead.
            </p>
          </div>
        )}
        {isConverting && (
          <div className="flex items-center justify-center py-3">
            <div
              className={cn(
                'w-5 h-5 border-2 rounded-full animate-spin',
                'border-[var(--rmd-ink-faint)]',
                'border-t-[var(--rmd-accent)]'
              )}
            />
            <span className="ml-2 text-sm text-ink-faint">
              Converting to base64…
            </span>
          </div>
        )}
        <div>
          <label htmlFor="img-embed-alt" className="block text-xs font-medium text-ink-muted mb-1">
            Alt text
          </label>
          <input
            id="img-embed-alt"
            ref={activeTab === 'embed' ? firstInputRef : undefined}
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image..."
            className={inputStyles}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleInsert}
            disabled={!canInsert()}
            className={buttonPrimaryStyles}
          >
            <Code2 size={14} />
            Embed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Insert image"
        className={cn(
          'relative z-10 flex flex-col',
          'w-full max-w-md',
          'mx-4 rounded-lg shadow-xl',
          'bg-canvas',
          'border border-line'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between',
            'px-5 py-4',
            'border-b border-line'
          )}
        >
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <ImageIcon size={20} />
            Insert Image
          </h2>
          <button
            onClick={onCancel}
            className={cn(
              'flex items-center justify-center',
              'w-8 h-8 rounded-md',
              'text-ink-muted',
              'hover:bg-sunken',
              'hover:text-ink',
              'transition-colors'
            )}
            aria-label="Close image insert modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab segmented control */}
        <div className="px-5 pt-4">
          <div
            className={cn(
              'flex rounded-md p-0.5',
              'bg-sunken',
              'border border-line'
            )}
            role="tablist"
            aria-label="Image source"
          >
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5',
                  'px-3 py-1.5 rounded text-xs font-medium',
                  'transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-5 py-4">
          {activeTab === 'url' && renderUrlTab()}
          {activeTab === 'local' && renderLocalTab()}
          {activeTab === 'embed' && renderEmbedTab()}
        </div>
      </div>
    </div>
  );
}

export default ImageInsertModal;
