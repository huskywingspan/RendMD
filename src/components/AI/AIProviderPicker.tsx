import React from 'react';
import { useAIStore } from '@/stores/aiStore';
import { PROVIDER_META } from '@/services/ai/AIService';
import type { AIProviderID } from '@/services/ai/types';
import { cn } from '@/utils/cn';

interface AIProviderPickerProps {
  className?: string;
}

export function AIProviderPicker({ className }: AIProviderPickerProps): JSX.Element {
  const { activeProvider, activeModel, setProvider, apiKeys } = useAIStore();

  // Only show providers that have an API key configured
  const configuredProviders = PROVIDER_META.filter((p) => apiKeys[p.id]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const newProvider = e.target.value as AIProviderID;
    const meta = PROVIDER_META.find((p) => p.id === newProvider);
    const defaultModel = meta && meta.models.length > 1 ? meta.models[1].id : meta?.models[0]?.id ?? '';
    setProvider(newProvider, defaultModel);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setProvider(activeProvider, e.target.value);
  };

  const currentProviderMeta = PROVIDER_META.find((p) => p.id === activeProvider);
  const currentModels = currentProviderMeta?.models ?? [];

  if (configuredProviders.length === 0) {
    return (
      <span className={cn('text-[10px] text-[var(--theme-text-muted)]', className)}>
        No providers configured
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {configuredProviders.length > 1 && (
        <select
          value={activeProvider}
          onChange={handleProviderChange}
          className="text-[10px] bg-transparent text-[var(--theme-text-muted)] border-none outline-none cursor-pointer"
          aria-label="AI provider"
        >
          {configuredProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <select
        value={activeModel}
        onChange={handleModelChange}
        className="text-[10px] bg-transparent text-[var(--theme-text-muted)] border-none outline-none cursor-pointer"
        aria-label="AI model"
      >
        {currentModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
