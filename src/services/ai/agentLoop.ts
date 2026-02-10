// Agent loop — iterates tool calls until the model produces a final text response

import type {
  AIProvider,
  ToolCompletionParams,
  ToolCall,
  ToolResult,
} from './types';

const MAX_ITERATIONS = 8;

/** Human-readable tool name for status messages. */
function formatToolName(name: string): string {
  switch (name) {
    case 'read_document':
      return 'Reading document';
    case 'search_document':
      return 'Searching document';
    case 'edit_document':
      return 'Editing document';
    case 'get_document_info':
      return 'Getting document info';
    default:
      return name;
  }
}

/**
 * Format tool results for the next API turn — each provider has a different format.
 *
 * - **OpenAI:** Array of `{ role: 'tool', tool_call_id, content }` messages
 * - **Anthropic:** Single `{ role: 'user', content: [{ type: 'tool_result', ... }] }` message
 * - **Gemini:** Single `{ role: 'user', parts: [{ functionResponse: { name, response } }] }` turn
 */
function formatToolResults(
  providerId: string,
  toolCalls: ToolCall[],
  results: ToolResult[],
): unknown {
  switch (providerId) {
    case 'openai':
      // OpenAI expects an array of tool-result messages (one per call)
      return results.map((r) => ({
        role: 'tool',
        tool_call_id: r.toolCallId,
        content: r.content,
      }));

    case 'anthropic':
      return {
        role: 'user',
        content: results.map((r) => ({
          type: 'tool_result',
          tool_use_id: r.toolCallId,
          content: r.content,
        })),
      };

    case 'google': {
      // Gemini needs the original function name — build an id→name map
      const nameById = new Map(toolCalls.map((tc) => [tc.id, tc.name]));
      return {
        role: 'user',
        parts: results.map((r) => ({
          functionResponse: {
            name: nameById.get(r.toolCallId) ?? 'unknown',
            response: { result: r.content },
          },
        })),
      };
    }

    default:
      return results;
  }
}

/**
 * Run the agent loop: repeatedly call the model with tool definitions,
 * execute any requested tool calls, and feed results back, until the model
 * produces a final text response or the iteration limit is reached.
 */
export async function runAgentLoop(
  provider: AIProvider,
  params: ToolCompletionParams,
  toolExecutor: (call: ToolCall) => Promise<string>,
  onStatus?: (message: string) => void,
  onIteration?: (iteration: number) => void,
): Promise<string> {
  if (!provider.generateWithTools) {
    throw new Error(`Provider ${provider.id} does not support tool calling.`);
  }

  const rawHistory: unknown[] = [];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    onIteration?.(iterations);
    onStatus?.('Thinking...');

    const response = await provider.generateWithTools(params, undefined, rawHistory);

    // Append the assistant's raw message to history
    rawHistory.push(response._rawAssistantMessage);

    // For OpenAI, the assistant message with tool_calls is already in rawHistory;
    // for Anthropic/Gemini the full assistant turn is pushed above.

    if (!response.toolCalls || response.toolCalls.length === 0) {
      // Final text response — done
      return response.text ?? '';
    }

    // Execute each tool call
    const results: ToolResult[] = [];
    for (const call of response.toolCalls) {
      onStatus?.(`${formatToolName(call.name)}...`);
      const output = await toolExecutor(call);
      results.push({ toolCallId: call.id, content: output });
    }

    // Format tool results for the next turn (provider-specific)
    const formattedResults = formatToolResults(
      provider.id,
      response.toolCalls,
      results,
    );

    // OpenAI returns an array of messages; others return a single message
    if (Array.isArray(formattedResults)) {
      rawHistory.push(...formattedResults);
    } else {
      rawHistory.push(formattedResults);
    }
  }

  return '[Agent reached maximum iterations (8). Here is what was accomplished so far.]';
}
