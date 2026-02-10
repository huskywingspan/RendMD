// Tests for the agent loop
import { describe, it, expect, vi } from 'vitest';
import { runAgentLoop } from '../agentLoop';
import type { AIProvider, ToolCompletionParams, ToolCompletionResponse } from '../types';

function createMockProvider(
  responses: ToolCompletionResponse[],
): AIProvider {
  let callIndex = 0;

  return {
    id: 'openai',
    name: 'MockProvider',
    models: [],
    generateCompletion: vi.fn(),
    streamCompletion: vi.fn() as unknown as AIProvider['streamCompletion'],
    validateApiKey: vi.fn(),
    generateWithTools: vi.fn(async () => {
      const resp = responses[callIndex] ?? { text: '[fallback]', _rawAssistantMessage: {} };
      callIndex++;
      return resp;
    }),
  };
}

const baseParams: ToolCompletionParams = {
  messages: [{ role: 'system', content: 'You are helpful.' }],
  tools: [{ name: 'test_tool', description: 'A test tool', parameters: { type: 'object', properties: {}, required: [] } }],
  model: 'gpt-4o',
  temperature: 0.5,
};

describe('runAgentLoop', () => {
  it('should return text when model produces a direct response (no tool calls)', async () => {
    const provider = createMockProvider([
      { text: 'Hello, how can I help?', _rawAssistantMessage: { role: 'assistant', content: 'Hello, how can I help?' } },
    ]);

    const result = await runAgentLoop(provider, baseParams, vi.fn());
    expect(result).toBe('Hello, how can I help?');
    expect(provider.generateWithTools).toHaveBeenCalledTimes(1);
  });

  it('should execute tool calls and loop back to the model', async () => {
    const provider = createMockProvider([
      {
        toolCalls: [{ id: 'tc-1', name: 'test_tool', arguments: { query: 'hello' } }],
        _rawAssistantMessage: { role: 'assistant', tool_calls: [] },
      },
      {
        text: 'Done! I used the tool.',
        _rawAssistantMessage: { role: 'assistant', content: 'Done! I used the tool.' },
      },
    ]);

    const toolExecutor = vi.fn().mockResolvedValue('Tool output');
    const result = await runAgentLoop(provider, baseParams, toolExecutor);

    expect(result).toBe('Done! I used the tool.');
    expect(toolExecutor).toHaveBeenCalledTimes(1);
    expect(toolExecutor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tc-1', name: 'test_tool' }),
    );
    expect(provider.generateWithTools).toHaveBeenCalledTimes(2);
  });

  it('should call onStatus and onIteration callbacks', async () => {
    const provider = createMockProvider([
      {
        toolCalls: [{ id: 'tc-1', name: 'read_document', arguments: {} }],
        _rawAssistantMessage: {},
      },
      { text: 'Final answer', _rawAssistantMessage: {} },
    ]);

    const onStatus = vi.fn();
    const onIteration = vi.fn();
    const toolExecutor = vi.fn().mockResolvedValue('content');

    await runAgentLoop(provider, baseParams, toolExecutor, onStatus, onIteration);

    expect(onIteration).toHaveBeenCalledWith(1);
    expect(onIteration).toHaveBeenCalledWith(2);
    expect(onStatus).toHaveBeenCalledWith('Thinking...');
    expect(onStatus).toHaveBeenCalledWith('Reading document...');
  });

  it('should respect the maximum iteration limit', async () => {
    // All responses request tool calls — should stop at 8
    const responses = Array.from({ length: 10 }, () => ({
      toolCalls: [{ id: 'tc-loop', name: 'test_tool', arguments: {} }],
      _rawAssistantMessage: {},
    }));

    const provider = createMockProvider(responses);
    const toolExecutor = vi.fn().mockResolvedValue('output');
    const result = await runAgentLoop(provider, baseParams, toolExecutor);

    expect(result).toContain('maximum iterations');
    expect(provider.generateWithTools).toHaveBeenCalledTimes(8);
    expect(toolExecutor).toHaveBeenCalledTimes(8);
  });

  it('should handle multiple tool calls in a single response', async () => {
    const provider = createMockProvider([
      {
        toolCalls: [
          { id: 'tc-a', name: 'test_tool', arguments: { a: 1 } },
          { id: 'tc-b', name: 'test_tool', arguments: { b: 2 } },
        ],
        _rawAssistantMessage: {},
      },
      { text: 'Both done.', _rawAssistantMessage: {} },
    ]);

    const toolExecutor = vi.fn().mockResolvedValue('ok');
    const result = await runAgentLoop(provider, baseParams, toolExecutor);

    expect(result).toBe('Both done.');
    expect(toolExecutor).toHaveBeenCalledTimes(2);
  });

  it('should throw if provider does not support generateWithTools', async () => {
    const provider: AIProvider = {
      id: 'openai',
      name: 'NoTools',
      models: [],
      generateCompletion: vi.fn(),
      streamCompletion: vi.fn() as unknown as AIProvider['streamCompletion'],
      validateApiKey: vi.fn(),
      // No generateWithTools
    };

    await expect(runAgentLoop(provider, baseParams, vi.fn())).rejects.toThrow(
      'does not support tool calling',
    );
  });
});
