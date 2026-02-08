import React, { useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import type { ThemeName } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'dark-basic', label: 'Dark' },
  { value: 'light-basic', label: 'Light' },
  { value: 'dark-glass', label: 'Dark Glass' },
  { value: 'light-glass', label: 'Light Glass' },
];

const FONT_MIN = 12;
const FONT_MAX = 24;

export function SettingsModal({ isOpen, onClose }: SettingsModalProps): React.ReactElement | null {
  const { theme, setTheme, fontSize, setFontSize, autoSaveEnabled, setAutoSaveEnabled } = useEditorStore();

  // Global Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Close settings"
          >
            <X size={18} className="text-[var(--theme-text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Theme selector */}
          <SettingRow label="Theme">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeName)}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
            >
              {THEMES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </SettingRow>

          {/* Font size */}
          <SettingRow label="Editor font size">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(FONT_MIN, fontSize - 1))}
                disabled={fontSize <= FONT_MIN}
                className="p-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors disabled:opacity-30"
                aria-label="Decrease font size"
              >
                <Minus size={14} className="text-[var(--theme-text-secondary)]" />
              </button>
              <span className="w-12 text-center text-sm font-mono text-[var(--theme-text-primary)]">
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize(Math.min(FONT_MAX, fontSize + 1))}
                disabled={fontSize >= FONT_MAX}
                className="p-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors disabled:opacity-30"
                aria-label="Increase font size"
              >
                <Plus size={14} className="text-[var(--theme-text-secondary)]" />
              </button>
            </div>
          </SettingRow>

          {/* Auto-save toggle */}
          <SettingRow label="Auto-save" description="Automatically save changes 2 seconds after editing">
            <button
              role="switch"
              aria-checked={autoSaveEnabled}
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSaveEnabled ? 'bg-[var(--theme-accent-primary)]' : 'bg-[var(--theme-bg-tertiary)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </SettingRow>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--theme-border-primary)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-md bg-[var(--theme-accent-primary)] text-white hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--theme-text-primary)]">{label}</div>
        {description && (
          <div className="text-xs text-[var(--theme-text-muted)] mt-0.5">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export default SettingsModal;
