// Google Gemini provider adapter — direct fetch, no SDK needed

import type { AIProvider, AIModel, CompletionParams, ToolCompletionParams, ToolResult, ToolCompletionResponse } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

const MODELS: AIModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxTokens: 8192, supportsStreaming: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxTokens: 8192, supportsStreaming: true },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', maxTokens: 8192, supportsStreaming: true },
  { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', maxTokens: 8192, supportsStreaming: true },
];

/**
 * Convert our universal message format to Gemini's `contents` + `parts` format.
 * Gemini uses a separate `systemInstruction` field instead of a system message.
 */
function convertMessages(
  messages: CompletionParams['messages'],
): {
  systemInstruction: { parts: { text: string }[] } | undefined;
  contents: { role: string; parts: { text: string }[] }[];
} {
  let systemInstruction: { parts: { text: string }[] } | undefined;
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      // Gemini uses 'user' and 'model' (not 'assistant')
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return { systemInstruction, contents };
}

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    id: 'google',
    name: 'Google Gemini',
    models: MODELS,

    async generateCompletion(params: CompletionParams): Promise<string> {
      const { systemInstruction, contents } = convertMessages(params.messages);

      const response = await fetch(
        `${GEMINI_API_URL}/models/${params.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents,
            generationConfig: {
              temperature: params.temperature ?? 0.7,
              maxOutputTokens: params.maxTokens ?? 1024,
            },
          }),
          signal: params.signal,
        },
      );

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`Gemini error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },

    async *streamCompletion(params: CompletionParams): AsyncIterable<string> {
      const { systemInstruction, contents } = convertMessages(params.messages);

      const response = await fetch(
        `${GEMINI_API_URL}/models/${params.model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents,
            generationConfig: {
              temperature: params.temperature ?? 0.7,
              maxOutputTokens: params.maxTokens ?? 1024,
            },
          }),
          signal: params.signal,
        },
      );

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`Gemini error ${response.status}: ${err}`);
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
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    },

    async validateApiKey(key: string): Promise<boolean> {
      try {
        const response = await fetch(
          `${GEMINI_API_URL}/models?key=${key}`,
        );
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
      const { systemInstruction, contents: baseContents } = convertMessages(params.messages);

      // Append raw history (previous model + function response turns)
      const contents = [...baseContents, ...(rawHistory ?? [])] as typeof baseContents;

      const tools = [
        {
          function_declarations: params.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];

      const response = await fetch(
        `${GEMINI_API_URL}/models/${params.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents,
            tools,
            generationConfig: {
              temperature: params.temperature ?? 0.7,
              maxOutputTokens: params.maxTokens ?? 2048,
            },
          }),
          signal: params.signal,
        },
      );

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`Gemini error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];

      // Check for function calls
      const fnCalls = parts.filter((p: Record<string, unknown>) => p.functionCall);

      if (fnCalls.length > 0) {
        return {
          toolCalls: fnCalls.map(
            (p: { functionCall: { name: string; args: Record<string, unknown> } }, i: number) => ({
              id: `gemini-${Date.now()}-${i}`,
              name: p.functionCall.name,
              arguments: p.functionCall.args,
            }),
          ),
          _rawAssistantMessage: { role: 'model', parts },
        };
      }

      const text = parts.find((p: Record<string, unknown>) => p.text)?.text ?? '';
      return {
        text: text as string,
        _rawAssistantMessage: { role: 'model', parts },
      };
    },
  };
}
