import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Provider } from '@prisma/client';
import {
  AIProvider,
  CompletionOptions,
  CompletionChunk,
  CompletionResult,
} from '../interfaces/ai-provider.interface';
import { toOpenAIMessages } from '../utils/message-mapper';

/**
 * OpenAI-compatible provider (OpenAI, DeepSeek, Ollama, custom endpoints).
 */
@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = Provider.OPENAI;
  readonly models = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ];

  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey:
        this.configService.get<string>('app.ai.openai.apiKey') ||
        'sk-not-configured',
      baseURL: this.configService.get<string>('app.ai.openai.baseUrl'),
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: toOpenAIMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      tools: options.tools,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? '',
      toolCalls: choice.message.tool_calls as CompletionResult['toolCalls'],
      finishReason: choice.finish_reason ?? undefined,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *stream(options: CompletionOptions): AsyncGenerator<CompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: toOpenAIMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      tools: options.tools,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      yield {
        content: delta?.content ?? undefined,
        finishReason: chunk.choices[0]?.finish_reason ?? undefined,
        usage: chunk.usage
          ? {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            }
          : undefined,
      };
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
