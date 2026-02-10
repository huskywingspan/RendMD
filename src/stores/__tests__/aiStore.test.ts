import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '@/stores/aiStore';

describe('aiStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAIStore.setState({
      isPanelOpen: false,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      activeProvider: 'openai',
      activeModel: 'gpt-4o-mini',
      apiKeys: {},
      ghostTextEnabled: true,
      pendingResult: null,
      currentDocumentId: null,
      _abortController: null,
    });
  });

  it('toggles panel open/closed', () => {
    expect(useAIStore.getState().isPanelOpen).toBe(false);
    useAIStore.getState().togglePanel();
    expect(useAIStore.getState().isPanelOpen).toBe(true);
    useAIStore.getState().togglePanel();
    expect(useAIStore.getState().isPanelOpen).toBe(false);
  });

  it('opens and closes panel explicitly', () => {
    useAIStore.getState().openPanel();
    expect(useAIStore.getState().isPanelOpen).toBe(true);
    useAIStore.getState().closePanel();
    expect(useAIStore.getState().isPanelOpen).toBe(false);
  });

  it('sets and removes API keys', () => {
    useAIStore.getState().setApiKey('openai', 'encrypted-key-123');
    expect(useAIStore.getState().apiKeys['openai']).toBe('encrypted-key-123');
    expect(useAIStore.getState().hasApiKey('openai')).toBe(true);
    expect(useAIStore.getState().hasApiKey('anthropic')).toBe(false);

    useAIStore.getState().removeApiKey('openai');
    expect(useAIStore.getState().apiKeys['openai']).toBeUndefined();
    expect(useAIStore.getState().hasApiKey('openai')).toBe(false);
  });

  it('sets provider and model', () => {
    useAIStore.getState().setProvider('anthropic', 'claude-sonnet-4-5-20250929');
    expect(useAIStore.getState().activeProvider).toBe('anthropic');
    expect(useAIStore.getState().activeModel).toBe('claude-sonnet-4-5-20250929');
  });

  it('manages pending result', () => {
    const result = { original: 'hello', replacement: 'Hello, world!', action: 'improve' };
    useAIStore.getState().setPendingResult(result);
    expect(useAIStore.getState().pendingResult).toEqual(result);

    useAIStore.getState().acceptResult();
    expect(useAIStore.getState().pendingResult).toBeNull();
  });

  it('rejects pending result', () => {
    useAIStore.getState().setPendingResult({ original: 'a', replacement: 'b', action: 'shorten' });
    useAIStore.getState().rejectResult();
    expect(useAIStore.getState().pendingResult).toBeNull();
  });

  it('clears conversation', () => {
    useAIStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'hi', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'hello', timestamp: Date.now() },
      ],
      streamingContent: 'partial...',
    });

    useAIStore.getState().clearConversation();
    expect(useAIStore.getState().messages).toEqual([]);
    expect(useAIStore.getState().streamingContent).toBe('');
  });

  it('toggles ghost text setting', () => {
    expect(useAIStore.getState().ghostTextEnabled).toBe(true);
    useAIStore.getState().setGhostTextEnabled(false);
    expect(useAIStore.getState().ghostTextEnabled).toBe(false);
  });

  it('sendMessage throws if no API key is configured', async () => {
    await expect(useAIStore.getState().sendMessage('hello')).rejects.toThrow(
      /No API key configured/,
    );
  });
});
