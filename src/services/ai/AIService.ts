// AI service facade — routes requests to the active provider

import type { AIProvider, AIProviderID, CompletionParams, AIModel } from './types';
import { createOpenAIProvider } from './providers/openai';
import { createAnthropicProvider } from './providers/anthropic';
import { createGeminiProvider } from './providers/google';
import { decryptKey } from './encryption';

/** All supported provider metadata (available even without API keys). */
export const PROVIDER_META: { id: AIProviderID; name: string; models: AIModel[] }[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 4096, supportsStreaming: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 4096, supportsStreaming: true },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', maxTokens: 4096, supportsStreaming: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', maxTokens: 4096, supportsStreaming: true },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxTokens: 8192, supportsStreaming: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxTokens: 8192, supportsStreaming: true },
      { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', maxTokens: 8192, supportsStreaming: true },
      { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', maxTokens: 8192, supportsStreaming: true },
    ],
  },
];

/** Create a provider instance for the given provider ID and encrypted API key. */
export async function createProvider(
  providerId: AIProviderID,
  encryptedKey: string,
): Promise<AIProvider> {
  const key = await decryptKey(encryptedKey);

  switch (providerId) {
    case 'openai':
      return createOpenAIProvider(key);
    case 'anthropic':
      return createAnthropicProvider(key);
    case 'google':
      return createGeminiProvider(key);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

/** Get the default model ID for a provider. */
export function getDefaultModel(providerId: AIProviderID): string {
  const meta = PROVIDER_META.find((p) => p.id === providerId);
  if (!meta || meta.models.length === 0) return '';
  // Return the second model (cheaper/faster) if available, else first
  return meta.models.length > 1 ? meta.models[1].id : meta.models[0].id;
}

/** Validate an API key for a provider (plain-text key, not encrypted). */
export async function validateProviderKey(
  providerId: AIProviderID,
  plaintextKey: string,
): Promise<boolean> {
  let provider: AIProvider;

  switch (providerId) {
    case 'openai':
      provider = createOpenAIProvider(plaintextKey);
      break;
    case 'anthropic':
      provider = createAnthropicProvider(plaintextKey);
      break;
    case 'google':
      provider = createGeminiProvider(plaintextKey);
      break;
    default:
      return false;
  }

  return provider.validateApiKey(plaintextKey);
}

/** Generate a non-streaming completion via the given provider. */
export async function generateCompletion(
  providerId: AIProviderID,
  encryptedKey: string,
  params: CompletionParams,
): Promise<string> {
  const provider = await createProvider(providerId, encryptedKey);
  return provider.generateCompletion(params);
}

/** Stream a completion via the given provider. */
export async function* streamCompletion(
  providerId: AIProviderID,
  encryptedKey: string,
  params: CompletionParams,
): AsyncIterable<string> {
  const provider = await createProvider(providerId, encryptedKey);
  yield* provider.streamCompletion(params);
}
