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
