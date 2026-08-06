import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  useSettingsStore,
  AUTOSAVE_DELAYS,
  MIN_READING_SIZE,
  MAX_READING_SIZE,
  type ReadingFamily,
  type ReadingMeasure,
  type ThemePreference,
} from '@/stores/settingsStore';
import { Modal, Section, Field, Toggle, SegmentedControl } from '@/components/UI/Modal';
import { clearSession } from '@/lib/sessionStore';
import { toast } from '@/stores/toastStore';
import { useBrowserSupport } from '@/hooks/useBrowserSupport';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const FAMILIES: { value: ReadingFamily; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

/** Values are stringified milliseconds — SegmentedControl is keyed on strings. */
const AUTOSAVE_DELAY_OPTIONS = AUTOSAVE_DELAYS.map((ms) => ({
  value: String(ms),
  label: ms < 60000 ? `${ms / 1000}s` : `${ms / 60000}m`,
}));

const MEASURES: { value: ReadingMeasure; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = useSettingsStore();
  const { canWriteFiles, canOpenFolders, isBrave } = useBrowserSupport();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <Section title="Appearance">
        <Field label="Theme">
          <SegmentedControl
            label="Theme"
            value={settings.theme}
            options={THEMES}
            onChange={settings.setTheme}
          />
        </Field>

        <Field label="Reading font" hint="Serif suits long prose; mono suits transcripts.">
          <SegmentedControl
            label="Reading font"
            value={settings.readingFamily}
            options={FAMILIES}
            onChange={settings.setReadingFamily}
          />
        </Field>

        <Field label="Text size">
          <div className="flex items-center gap-1">
            <StepButton
              icon={<Minus size={13} />}
              label="Decrease text size"
              onPress={() => settings.adjustReadingSize(-1)}
              disabled={settings.readingSize <= MIN_READING_SIZE}
            />
            <span className="w-10 text-center text-sm tabular-nums text-ink">
              {settings.readingSize}px
            </span>
            <StepButton
              icon={<Plus size={13} />}
              label="Increase text size"
              onPress={() => settings.adjustReadingSize(1)}
              disabled={settings.readingSize >= MAX_READING_SIZE}
            />
          </div>
        </Field>

        <Field label="Line width" hint="How wide a line of text runs before it wraps.">
          <SegmentedControl
            label="Line width"
            value={settings.readingMeasure}
            options={MEASURES}
            onChange={settings.setReadingMeasure}
          />
        </Field>
      </Section>

      <Section title="Editing">
        <Field
          label="Save automatically"
          hint="Writes to the file about a second after you stop typing."
        >
          <Toggle
            label="Save automatically"
            checked={settings.autoSave}
            onChange={settings.setAutoSave}
          />
        </Field>

        <Field
          label="Autosave delay"
          hint="How long after you stop typing. The countdown restarts on every keystroke, so this is a pause, not an interval."
        >
          <SegmentedControl
            label="Autosave delay"
            value={String(settings.autoSaveDelay)}
            options={AUTOSAVE_DELAY_OPTIONS}
            onChange={(value) => settings.setAutoSaveDelay(Number(value))}
            disabled={!settings.autoSave}
          />
        </Field>

        <Field label="Spellcheck" hint="Underlines misspellings in the rendered view.">
          <Toggle
            label="Spellcheck"
            checked={settings.spellcheck}
            onChange={settings.setSpellcheck}
          />
        </Field>

        <Field
          label="Format toolbar"
          hint="A row of formatting and insert controls above the rendered document. Ctrl+Shift+B."
        >
          <Toggle
            label="Format toolbar"
            checked={settings.formatToolbar}
            onChange={settings.setFormatToolbar}
          />
        </Field>

        <Field label="Reopen tabs on launch" hint="Restores the documents you had open.">
          <Toggle
            label="Reopen tabs on launch"
            checked={settings.restoreSession}
            onChange={settings.setRestoreSession}
          />
        </Field>
      </Section>

      <Section title="This browser">
        {canWriteFiles ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            Full file access is available: RendMD can open files and save changes straight back to
            them.
            {!canOpenFolders && ' Opening whole folders is not supported here.'}
          </p>
        ) : isBrave ? (
          <>
            <p className="text-sm leading-relaxed text-ink-muted">
              Brave blocks the File System Access API by default, so RendMD can't open folders or
              save in place — it downloads a copy instead. Shields doesn't affect this; it's a
              browser flag.
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              Open <code className="font-mono text-xs">brave://flags</code>, search for{' '}
              <strong>File System</strong>, set it to Enabled, and restart Brave.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">
            This browser can't write files in place. You can open documents, and saving will
            download a copy instead. Chrome or Edge give the full experience.
          </p>
        )}
      </Section>

      <Section title="Data">
        <p className="text-sm leading-relaxed text-ink-muted">
          Everything RendMD stores — your open documents, the folder you chose, and these settings —
          lives in this browser on this device. Nothing is sent anywhere.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={settings.resetAppearance}
            className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:bg-hover hover:text-ink"
          >
            Reset appearance
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!confirmingReset) {
                setConfirmingReset(true);
                return;
              }
              await clearSession();
              toast.success('Cleared. Reload to start fresh.');
              setConfirmingReset(false);
            }}
            onBlur={() => setConfirmingReset(false)}
            className="rounded-md border border-danger px-2.5 py-1.5 text-sm text-danger hover:bg-danger-soft"
          >
            {confirmingReset ? 'Really clear everything?' : 'Clear stored data'}
          </button>
        </div>
      </Section>
    </Modal>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 place-items-center rounded-md border border-line text-ink-muted hover:bg-hover hover:text-ink disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

export default SettingsModal;
