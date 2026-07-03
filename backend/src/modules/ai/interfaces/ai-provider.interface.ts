import { Provider } from '@prisma/client';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface CompletionChunk {
  content?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CompletionResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: CompletionChunk['usage'];
  finishReason?: string;
}

/**
 * Abstract interface for AI providers.
 * Implement this to add support for a new provider.
 */
export interface AIProvider {
  readonly name: Provider;
  readonly models: string[];

  /**
   * Generate a completion (non-streaming).
   */
  complete(options: CompletionOptions): Promise<CompletionResult>;

  /**
   * Stream a completion via async generator.
   */
  stream(options: CompletionOptions): AsyncGenerator<CompletionChunk>;

  /**
   * Generate embeddings for RAG.
   */
  embed(text: string): Promise<number[]>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}
