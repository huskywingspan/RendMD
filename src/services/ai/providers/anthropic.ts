// Anthropic provider adapter — uses @anthropic-ai/sdk for CORS support

import type { AIProvider, AIModel, CompletionParams, ToolCompletionParams, ToolResult, ToolCompletionResponse } from '../types';

const MODELS: AIModel[] = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', maxTokens: 4096, supportsStreaming: true },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', maxTokens: 4096, supportsStreaming: true },
];

/**
 * Anthropic's message format puts `system` as a top-level param, not in messages.
 * This helper extracts the system prompt and converts the rest.
 */
function convertMessages(
  messages: CompletionParams['messages'],
): { system: string | undefined; messages: { role: 'user' | 'assistant'; content: string }[] } {
  let system: string | undefined;
  const converted: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = msg.content;
    } else {
      converted.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }
  }

  return { system, messages: converted };
}

export function createAnthropicProvider(apiKey: string): AIProvider {
  // Dynamic import to avoid bundling the SDK when Anthropic isn't used
  let clientPromise: Promise<typeof import('@anthropic-ai/sdk')> | null = null;

  function getSDK(): Promise<typeof import('@anthropic-ai/sdk')> {
    if (!clientPromise) {
      clientPromise = import('@anthropic-ai/sdk');
    }
    return clientPromise;
  }

  return {
    id: 'anthropic',
    name: 'Anthropic',
    models: MODELS,

    async generateCompletion(params: CompletionParams): Promise<string> {
      const Anthropic = (await getSDK()).default;
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const { system, messages } = convertMessages(params.messages);

      const response = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 1024,
        system,
        messages,
      });

      const block = response.content[0];
      return block.type === 'text' ? block.text : '';
    },

    async *streamCompletion(params: CompletionParams): AsyncIterable<string> {
      const Anthropic = (await getSDK()).default;
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const { system, messages } = convertMessages(params.messages);

      const stream = client.messages.stream({
        model: params.model,
        max_tokens: params.maxTokens ?? 1024,
        system,
        messages,
      });

      // Handle abort signal
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          stream.abort();
        }, { once: true });
      }

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    },

    async validateApiKey(key: string): Promise<boolean> {
      try {
        const Anthropic = (await getSDK()).default;
        const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
        // Use a minimal message to test the key
        await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        });
        return true;
      } catch {
        return false;
      }
    },

    async generateWithTools(
      params: ToolCompletionParams,
      _previousToolResults?: ToolResult[],
      rawHistory?: unknown[],
    ): Promise<ToolCompletionResponse> {
      const Anthropic = (await getSDK()).default;
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const { system, messages: baseMessages } = convertMessages(params.messages);

      // Append raw history (previous assistant + tool_result messages) from agent loop
      const messages = [...baseMessages, ...(rawHistory ?? [])] as Parameters<
        InstanceType<typeof Anthropic>['messages']['create']
      >[0]['messages'];

      // Convert tool definitions to Anthropic format
      const tools = params.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: { ...t.parameters, type: 'object' as const },
      }));

      const response = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 2048,
        system,
        messages,
        tools,
      });

      // Check for tool_use blocks
      const toolUseBlocks = response.content.filter(
        (b) => b.type === 'tool_use',
      );

      if (toolUseBlocks.length > 0) {
        return {
          toolCalls: toolUseBlocks.map((b) => {
            const block = b as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
            return {
              id: block.id,
              name: block.name,
              arguments: block.input,
            };
          }),
          _rawAssistantMessage: { role: 'assistant', content: response.content },
        };
      }

      const textBlock = response.content.find(
        (b: { type: string }) => b.type === 'text',
      ) as { type: 'text'; text: string } | undefined;

      return {
        text: textBlock?.text ?? '',
        _rawAssistantMessage: { role: 'assistant', content: response.content },
      };
    },
  };
}
