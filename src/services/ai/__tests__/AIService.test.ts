import { describe, it, expect } from 'vitest';
import { PROVIDER_META, getDefaultModel } from '@/services/ai/AIService';

describe('PROVIDER_META', () => {
  it('contains OpenAI, Anthropic, and Google providers', () => {
    const ids = PROVIDER_META.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('google');
  });

  it('each provider has at least one model', () => {
    for (const provider of PROVIDER_META) {
      expect(provider.models.length).toBeGreaterThanOrEqual(1);
      expect(provider.models[0].id).toBeTruthy();
      expect(provider.models[0].name).toBeTruthy();
    }
  });
});

describe('getDefaultModel', () => {
  it('returns the second (cheaper) model for OpenAI', () => {
    expect(getDefaultModel('openai')).toBe('gpt-4o-mini');
  });

  it('returns the second model for Anthropic', () => {
    expect(getDefaultModel('anthropic')).toBe('claude-3-haiku-20240307');
  });

  it('returns the second model for Google', () => {
    expect(getDefaultModel('google')).toBe('gemini-2.0-flash-lite');
  });
});
