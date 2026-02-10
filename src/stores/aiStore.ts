// AI state management — conversation, provider settings, streaming

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { AIChatMessage, AIProviderID, PendingResult, AIContext } from '@/services/ai/types';
import { streamCompletion, PROVIDER_META, getDefaultModel } from '@/services/ai/AIService';
import { buildMessages, SYSTEM_PROMPTS } from '@/services/ai/prompts';

interface AIStore {
  // Panel state
  isPanelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Conversation (per-document)
  messages: AIChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  sendMessage: (prompt: string, context?: AIContext) => Promise<void>;
  cancelStream: () => void;
  clearConversation: () => void;

  // Provider settings
  activeProvider: AIProviderID;
  activeModel: string;
  setProvider: (provider: AIProviderID, model: string) => void;

  // Quick action results
  pendingResult: PendingResult | null;
  setPendingResult: (result: PendingResult | null) => void;
  acceptResult: () => void;
  rejectResult: () => void;

  // API keys (encrypted)
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, encryptedKey: string) => void;
  removeApiKey: (provider: string) => void;
  hasApiKey: (provider: string) => boolean;

  // Ghost text settings
  ghostTextEnabled: boolean;
  setGhostTextEnabled: (enabled: boolean) => void;

  // Chat history persistence
  loadChatHistory: (documentId: string) => Promise<void>;
  saveChatHistory: (documentId: string) => Promise<void>;
  currentDocumentId: string | null;

  // Internal
  _abortController: AbortController | null;
}

/** Persisted fields for localStorage (settings only, not messages). */
interface PersistedAIState {
  activeProvider: AIProviderID;
  activeModel: string;
  apiKeys: Record<string, string>;
  ghostTextEnabled: boolean;
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // Panel
      isPanelOpen: false,
      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),

      // Conversation
      messages: [],
      isStreaming: false,
      streamingContent: '',
      _abortController: null,

      sendMessage: async (prompt: string, context?: AIContext) => {
        const state = get();
        const encryptedKey = state.apiKeys[state.activeProvider];
        if (!encryptedKey) {
          throw new Error(`No API key configured for ${state.activeProvider}`);
        }

        // Add user message
        const userMsg: AIChatMessage = {
          id: generateMessageId(),
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        };

        const updatedMessages = [...state.messages, userMsg];
        set({ messages: updatedMessages, isStreaming: true, streamingContent: '' });

        // Build completion messages from conversation history
        const completionMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
          { role: 'system', content: SYSTEM_PROMPTS.chat },
        ];

        // Add document context if provided
        if (context?.documentContent) {
          completionMessages.push({
            role: 'system',
            content: `The user's document content (truncated to 2000 chars):\n${context.documentContent.slice(0, 2000)}`,
          });
        }
        if (context?.selectedText) {
          completionMessages.push({
            role: 'system',
            content: `Currently selected text:\n${context.selectedText}`,
          });
        }

        // Add conversation history (last 20 messages to stay within context limits)
        for (const msg of updatedMessages.slice(-20)) {
          completionMessages.push({ role: msg.role, content: msg.content });
        }

        const abortController = new AbortController();
        set({ _abortController: abortController });

        let fullContent = '';

        try {
          const stream = streamCompletion(state.activeProvider, encryptedKey, {
            messages: completionMessages,
            model: state.activeModel,
            temperature: 0.7,
            maxTokens: 2048,
            signal: abortController.signal,
          });

          for await (const chunk of stream) {
            fullContent += chunk;
            set({ streamingContent: fullContent });
          }

          // Add assistant message
          const assistantMsg: AIChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
            model: state.activeModel,
            provider: state.activeProvider,
          };

          set((s) => ({
            messages: [...s.messages, assistantMsg],
            isStreaming: false,
            streamingContent: '',
            _abortController: null,
          }));

          // Auto-save chat history
          const docId = get().currentDocumentId;
          if (docId) {
            get().saveChatHistory(docId);
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // Stream was cancelled — save partial content if any
            if (fullContent) {
              const partialMsg: AIChatMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: fullContent + ' [cancelled]',
                timestamp: Date.now(),
                model: state.activeModel,
                provider: state.activeProvider,
              };
              set((s) => ({
                messages: [...s.messages, partialMsg],
                isStreaming: false,
                streamingContent: '',
                _abortController: null,
              }));
            } else {
              set({ isStreaming: false, streamingContent: '', _abortController: null });
            }
          } else {
            // Real error — add as assistant error message
            const errorMsg: AIChatMessage = {
              id: generateMessageId(),
              role: 'assistant',
              content: `Error: ${(err as Error).message}`,
              timestamp: Date.now(),
            };
            set((s) => ({
              messages: [...s.messages, errorMsg],
              isStreaming: false,
              streamingContent: '',
              _abortController: null,
            }));
          }
        }
      },

      cancelStream: () => {
        const state = get();
        state._abortController?.abort();
        set({ isStreaming: false, streamingContent: '', _abortController: null });
      },

      clearConversation: () => {
        const docId = get().currentDocumentId;
        set({ messages: [], streamingContent: '' });
        // Clear persisted history
        if (docId) {
          idbDel(`ai-chat-${docId}`).catch(() => {});
        }
      },

      // Provider
      activeProvider: 'openai',
      activeModel: 'gpt-4o-mini',
      setProvider: (provider, model) => set({ activeProvider: provider, activeModel: model }),

      // Quick actions
      pendingResult: null,
      setPendingResult: (result) => set({ pendingResult: result }),
      acceptResult: () => set({ pendingResult: null }),
      rejectResult: () => set({ pendingResult: null }),

      // API keys
      apiKeys: {},
      setApiKey: (provider, encryptedKey) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: encryptedKey } })),
      removeApiKey: (provider) =>
        set((s) => {
          const keys = { ...s.apiKeys };
          delete keys[provider];
          return { apiKeys: keys };
        }),
      hasApiKey: (provider) => Boolean(get().apiKeys[provider]),

      // Ghost text
      ghostTextEnabled: true,
      setGhostTextEnabled: (enabled) => set({ ghostTextEnabled: enabled }),

      // Chat history (IndexedDB)
      currentDocumentId: null,

      loadChatHistory: async (documentId: string) => {
        set({ currentDocumentId: documentId, messages: [], streamingContent: '' });
        try {
          const stored = await idbGet<AIChatMessage[]>(`ai-chat-${documentId}`);
          if (stored && Array.isArray(stored)) {
            set({ messages: stored });
          }
        } catch {
          // IndexedDB unavailable — start with empty conversation
        }
      },

      saveChatHistory: async (documentId: string) => {
        const { messages } = get();
        try {
          await idbSet(`ai-chat-${documentId}`, messages);
        } catch {
          // IndexedDB full or unavailable — fail silently
        }
      },
    }),
    {
      name: 'rendmd-ai-settings',
      partialize: (state): PersistedAIState => ({
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
        apiKeys: state.apiKeys,
        ghostTextEnabled: state.ghostTextEnabled,
      }),
      merge: (persisted, current) => {
        const p = persisted as PersistedAIState | undefined;
        const provider = p?.activeProvider ?? current.activeProvider;
        let model = p?.activeModel ?? current.activeModel;

        // Auto-correct stale model IDs that no longer exist in PROVIDER_META
        const providerMeta = PROVIDER_META.find((pm) => pm.id === provider);
        const modelExists = providerMeta?.models.some((m) => m.id === model);
        if (!modelExists) {
          model = getDefaultModel(provider);
        }

        return {
          ...current,
          activeProvider: provider,
          activeModel: model,
          apiKeys: p?.apiKeys ?? current.apiKeys,
          ghostTextEnabled: p?.ghostTextEnabled ?? current.ghostTextEnabled,
        };
      },
    },
  ),
);

/**
 * Execute a quick AI action on selected text (non-chat, one-shot).
 * Returns the result text via streaming.
 */
export async function executeQuickAction(
  action: string,
  selectedText: string,
  documentContent: string,
  customInstruction?: string,
  onChunk?: (partial: string) => void,
): Promise<string> {
  const state = useAIStore.getState();
  const encryptedKey = state.apiKeys[state.activeProvider];
  if (!encryptedKey) {
    throw new Error(`No API key configured for ${state.activeProvider}`);
  }

  const messages = buildMessages(action, selectedText, documentContent, customInstruction);
  let fullContent = '';

  const abortController = new AbortController();
  // Store abort controller so it can be cancelled
  useAIStore.setState({ _abortController: abortController, isStreaming: true });

  try {
    const stream = streamCompletion(state.activeProvider, encryptedKey, {
      messages,
      model: state.activeModel,
      temperature: 0.7,
      maxTokens: 2048,
      signal: abortController.signal,
    });

    for await (const chunk of stream) {
      fullContent += chunk;
      onChunk?.(fullContent);
    }

    useAIStore.setState({ isStreaming: false, _abortController: null });
    return fullContent;
  } catch (err) {
    useAIStore.setState({ isStreaming: false, _abortController: null });
    if ((err as Error).name === 'AbortError') {
      return fullContent;
    }
    throw err;
  }
}
