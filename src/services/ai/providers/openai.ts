// OpenAI provider adapter — direct fetch, no SDK needed

import type { AIProvider, AIModel, CompletionParams, ToolCompletionParams, ToolResult, ToolCompletionResponse } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1';

const MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 4096, supportsStreaming: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 4096, supportsStreaming: true },
];

function makeHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function createOpenAIProvider(apiKey: string): AIProvider {
  return {
    id: 'openai',
    name: 'OpenAI',
    models: MODELS,

    async generateCompletion(params: CompletionParams): Promise<string> {
      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: makeHeaders(apiKey),
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 1024,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    },

    async *streamCompletion(params: CompletionParams): AsyncIterable<string> {
      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: makeHeaders(apiKey),
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 1024,
          stream: true,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI error ${response.status}: ${err}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      }
    },

    async validateApiKey(key: string): Promise<boolean> {
      try {
        const response = await fetch(`${OPENAI_API_URL}/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async generateWithTools(
      params: ToolCompletionParams,
      _previousToolResults?: ToolResult[],
      rawHistory?: unknown[],
    ): Promise<ToolCompletionResponse> {
      // Build messages: base params + raw history from prior iterations
      const messages = [...params.messages, ...(rawHistory ?? [])] as Record<string, unknown>[];

      const tools = params.tools.map((t) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));

      const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: makeHeaders(apiKey),
        body: JSON.stringify({
          model: params.model,
          messages,
          tools,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2048,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      if (msg?.tool_calls?.length) {
        return {
          toolCalls: msg.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          })),
          _rawAssistantMessage: msg,
        };
      }

      return {
        text: msg?.content ?? '',
        _rawAssistantMessage: msg,
      };
    },
  };
}
