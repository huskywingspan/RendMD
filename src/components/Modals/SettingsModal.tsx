import React, { useEffect, useRef } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { AISettingsSection } from '@/components/AI/AISettingsSection';
import type { UIDensity } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_MIN = 12;
const FONT_MAX = 24;

const DENSITY_OPTIONS: { value: UIDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps): React.ReactElement | null {
  const { fontSize, setFontSize, autoSaveEnabled, setAutoSaveEnabled, uiDensity, setUIDensity } = useEditorStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Global Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap: move focus into the dialog on open
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    function trapFocus(e: KeyboardEvent): void {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="w-full max-w-md mx-4 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-2xl max-h-[85vh] flex flex-col"
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
        <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
          {/* EDITOR section */}
          <SectionHeader label="Editor" />

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

          {/* APPEARANCE section */}
          <SectionHeader label="Appearance" />

          {/* UI Density toggle */}
          <SettingRow label="UI density" description="Adjust spacing and padding across the interface">
            <div className="flex rounded-lg border border-[var(--theme-border-primary)] overflow-hidden">
              {DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUIDensity(opt.value)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    uiDensity === opt.value
                      ? 'bg-[var(--theme-accent-primary)] text-white'
                      : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingRow>

          {/* AI section */}
          <SectionHeader label="AI Assistant" />
          <AISettingsSection />
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

interface SectionHeaderProps {
  label: string;
}

function SectionHeader({ label }: SectionHeaderProps): JSX.Element {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] mt-2 first:mt-0">
      {label}
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
