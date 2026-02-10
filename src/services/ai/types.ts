// AI service type definitions for RendMD v1.1

export interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  generateCompletion(params: CompletionParams): Promise<string>;
  streamCompletion(params: CompletionParams): AsyncIterable<string>;
  validateApiKey(key: string): Promise<boolean>;
  generateWithTools?(
    params: ToolCompletionParams,
    previousToolResults?: ToolResult[],
    rawHistory?: unknown[],
  ): Promise<ToolCompletionResponse>;
}

export interface CompletionParams {
  messages: AIMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
}

export interface AIContext {
  selectedText?: string;
  documentContent?: string;
  cursorPosition?: number;
  precedingText?: string;
}

export type QuickAction =
  | 'improve'
  | 'shorten'
  | 'expand'
  | 'formal'
  | 'casual'
  | 'professional'
  | 'continue'
  | 'translate'
  | 'custom';

export interface PendingResult {
  original: string;
  replacement: string;
  action: string;
}

export type AIProviderID = 'openai' | 'anthropic' | 'google';

// --- Agent Mode types ---

/** JSON Schema-based tool definition (provider-agnostic). */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** A tool call requested by the model. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Result of executing a tool locally. */
export interface ToolResult {
  toolCallId: string;
  content: string;
}

/** Params for a completion that may include tool calls. */
export interface ToolCompletionParams extends CompletionParams {
  tools: ToolDefinition[];
}

/** Response from a tool-aware completion. */
export interface ToolCompletionResponse {
  /** If the model wants to call tools (no text content). */
  toolCalls?: ToolCall[];
  /** If the model produced a final text response (no tool calls). */
  text?: string;
  /** Raw provider-specific message to append to history for multi-turn. */
  _rawAssistantMessage: unknown;
}
