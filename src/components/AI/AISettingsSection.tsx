import { useState, useCallback } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAIStore } from '@/stores/aiStore';
import { PROVIDER_META, validateProviderKey, getDefaultModel } from '@/services/ai/AIService';
import { encryptKey } from '@/services/ai/encryption';
import type { AIProviderID } from '@/services/ai/types';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface ProviderKeyEntry {
  provider: AIProviderID;
  name: string;
  placeholder: string;
}

const PROVIDERS: ProviderKeyEntry[] = [
  { provider: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { provider: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { provider: 'google', name: 'Google Gemini', placeholder: 'AI...' },
];

export function AISettingsSection(): JSX.Element {
  const {
    setApiKey, removeApiKey, hasApiKey,
    activeProvider, activeModel, setProvider,
    ghostTextEnabled, setGhostTextEnabled,
  } = useAIStore();

  return (
    <div className="space-y-4">
      {/* API Keys */}
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]">
        API Keys
      </div>

      {PROVIDERS.map(({ provider, name, placeholder }) => (
        <APIKeyRow
          key={provider}
          providerName={name}
          placeholder={placeholder}
          hasKey={hasApiKey(provider)}
          onSave={async (key) => {
            const encrypted = await encryptKey(key);
            setApiKey(provider, encrypted);
            // Set as active if no provider configured yet
            if (!hasApiKey(activeProvider) || activeProvider === provider) {
              setProvider(provider, getDefaultModel(provider));
            }
          }}
          onRemove={() => removeApiKey(provider)}
          onValidate={(key) => validateProviderKey(provider, key)}
        />
      ))}

      <div className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed mt-2 px-1">
        Your API keys are encrypted locally. Keys are sent directly to providers — RendMD has no backend server.
      </div>

      {/* Preferences */}
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)] mt-4">
        AI Preferences
      </div>

      {/* Default provider */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--theme-text-primary)]">Default provider</div>
        </div>
        <select
          value={activeProvider}
          onChange={(e) => {
            const p = e.target.value as AIProviderID;
            setProvider(p, getDefaultModel(p));
          }}
          className="text-sm bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] rounded-md px-2 py-1"
        >
          {PROVIDERS.filter(({ provider }) => hasApiKey(provider)).map(({ provider, name }) => (
            <option key={provider} value={provider}>{name}</option>
          ))}
          {PROVIDERS.every(({ provider }) => !hasApiKey(provider)) && (
            <option value="" disabled>No keys configured</option>
          )}
        </select>
      </div>

      {/* Default model */}
      {hasApiKey(activeProvider) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--theme-text-primary)]">Default model</div>
          </div>
          <select
            value={activeModel}
            onChange={(e) => setProvider(activeProvider, e.target.value)}
            className="text-sm bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-primary)] rounded-md px-2 py-1"
          >
            {PROVIDER_META.find((p) => p.id === activeProvider)?.models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Ghost text toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--theme-text-primary)]">Ghost text</div>
          <div className="text-xs text-[var(--theme-text-muted)] mt-0.5">
            Show AI writing suggestions as you type (desktop only)
          </div>
        </div>
        <button
          role="switch"
          aria-checked={ghostTextEnabled}
          onClick={() => setGhostTextEnabled(!ghostTextEnabled)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            ghostTextEnabled ? 'bg-[var(--theme-accent-primary)]' : 'bg-[var(--theme-bg-tertiary)]',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              ghostTextEnabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
    </div>
  );
}

/** Individual API key row with input, show/hide, validate, save, remove */
function APIKeyRow({
  providerName,
  placeholder,
  hasKey,
  onSave,
  onRemove,
  onValidate,
}: {
  providerName: string;
  placeholder: string;
  hasKey: boolean;
  onSave: (key: string) => Promise<void>;
  onRemove: () => void;
  onValidate: (key: string) => Promise<boolean>;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validation, setValidation] = useState<ValidationState>('idle');

  const handleSave = useCallback(async () => {
    if (!keyValue.trim()) return;
    setValidation('validating');
    try {
      const isValid = await onValidate(keyValue.trim());
      setValidation(isValid ? 'valid' : 'invalid');
      // Save regardless — validation failure may be due to network issues
      await onSave(keyValue.trim());
      setTimeout(() => {
        setEditing(false);
        setKeyValue('');
        setValidation('idle');
      }, 1500);
    } catch {
      setValidation('invalid');
      // Still save the key
      await onSave(keyValue.trim());
      setTimeout(() => {
        setEditing(false);
        setKeyValue('');
        setValidation('idle');
      }, 1500);
    }
  }, [keyValue, onSave, onValidate]);

  const handleRemove = useCallback(() => {
    onRemove();
    setEditing(false);
    setKeyValue('');
    setValidation('idle');
  }, [onRemove]);

  if (hasKey && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="text-sm text-[var(--theme-text-primary)]">{providerName}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check size={12} /> Configured
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors"
          >
            Change
          </button>
          <button
            onClick={handleRemove}
            className="p-1 text-[var(--theme-text-muted)] hover:text-red-500 transition-colors"
            title={`Remove ${providerName} key`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (editing || !hasKey) {
    return (
      <div className="space-y-1.5">
        <div className="text-sm text-[var(--theme-text-primary)]">{providerName}</div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => { setKeyValue(e.target.value); setValidation('idle'); }}
              placeholder={placeholder}
              className={cn(
                'w-full text-sm bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]',
                'border rounded-md px-3 py-1.5 pr-8',
                'placeholder:text-[var(--theme-text-muted)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]',
                validation === 'valid' && 'border-green-500',
                validation === 'invalid' && 'border-red-500',
                validation === 'idle' && 'border-[var(--theme-border-primary)]',
                validation === 'validating' && 'border-yellow-500',
              )}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Status indicator */}
          {validation === 'validating' && <Loader2 size={16} className="animate-spin text-yellow-500" />}
          {validation === 'valid' && <Check size={16} className="text-green-500" />}
          {validation === 'invalid' && <X size={16} className="text-red-500" />}

          <button
            onClick={handleSave}
            disabled={!keyValue.trim() || validation === 'validating'}
            className={cn(
              'text-xs px-2 py-1 rounded-md transition-colors',
              keyValue.trim()
                ? 'bg-[var(--theme-accent-primary)] text-white hover:opacity-90'
                : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)]',
            )}
          >
            Save
          </button>

          {hasKey && (
            <button
              onClick={() => { setEditing(false); setKeyValue(''); setValidation('idle'); }}
              className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"
            >
              Cancel
            </button>
          )}
        </div>

        {validation === 'invalid' && (
          <div className="text-xs text-red-500">
            Key validation failed — saved anyway (may be a network issue)
          </div>
        )}
      </div>
    );
  }

  return <></>;
}
