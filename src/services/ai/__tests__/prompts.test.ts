import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPTS, translatePrompt, customPrompt, buildMessages } from '@/services/ai/prompts';

describe('SYSTEM_PROMPTS', () => {
  it('contains all required action prompts', () => {
    const requiredKeys = ['improve', 'shorten', 'expand', 'formal', 'casual', 'professional', 'continue', 'chat'];
    for (const key of requiredKeys) {
      expect(SYSTEM_PROMPTS[key]).toBeDefined();
      expect(typeof SYSTEM_PROMPTS[key]).toBe('string');
      expect(SYSTEM_PROMPTS[key].length).toBeGreaterThan(10);
    }
  });
});

describe('translatePrompt', () => {
  it('includes the target language in the prompt', () => {
    const result = translatePrompt('Spanish');
    expect(result).toContain('Spanish');
    expect(result).toContain('Translate');
  });
});

describe('customPrompt', () => {
  it('wraps the user instruction', () => {
    const result = customPrompt('Make it spooky');
    expect(result).toContain('Make it spooky');
    expect(result).toContain('Return only the result');
  });
});

describe('buildMessages', () => {
  it('builds improve action messages with selected text', () => {
    const messages = buildMessages('improve', 'Hello world', 'Full document');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(SYSTEM_PROMPTS.improve);
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('Hello world');
  });

  it('builds chat action messages', () => {
    const messages = buildMessages('chat', undefined, 'Full document');
    expect(messages[0].content).toBe(SYSTEM_PROMPTS.chat);
    expect(messages[1].content).toContain('Full document');
  });

  it('builds translate action messages', () => {
    const messages = buildMessages('translate:French', 'Hello', 'Doc');
    expect(messages[0].content).toContain('French');
    expect(messages[1].content).toBe('Hello');
  });

  it('builds custom action messages', () => {
    const messages = buildMessages('custom', 'Some text', 'Doc', 'Make it formal');
    expect(messages[0].content).toContain('Make it formal');
    expect(messages[1].content).toBe('Some text');
  });

  it('uses document context when no selected text', () => {
    const messages = buildMessages('improve', undefined, 'Long document content here');
    expect(messages[1].content).toContain('Document context');
    expect(messages[1].content).toContain('Long document content');
  });

  it('truncates document context to 2000 chars', () => {
    const longDoc = 'A'.repeat(3000);
    const messages = buildMessages('improve', undefined, longDoc);
    // The user content should contain truncated doc
    expect(messages[1].content.length).toBeLessThan(3000);
  });

  it('falls back to improve prompt for unknown action', () => {
    const messages = buildMessages('nonexistent_action', 'text', 'doc');
    expect(messages[0].content).toBe(SYSTEM_PROMPTS.improve);
  });
});
