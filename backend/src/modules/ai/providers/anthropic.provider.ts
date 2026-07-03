import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '@prisma/client';
import {
  AIProvider,
  CompletionOptions,
  CompletionChunk,
  CompletionResult,
} from '../interfaces/ai-provider.interface';

/**
 * Anthropic Claude provider.
 */
@Injectable()
export class AnthropicProvider implements AIProvider {
  readonly name = Provider.ANTHROPIC;
  readonly models = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ];

  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('app.ai.anthropic.apiKey') ?? '',
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages,
      temperature: options.temperature ?? 0.7,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      content: textBlock?.type === 'text' ? textBlock.text : '',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason ?? undefined,
    };
  }

  async *stream(options: CompletionOptions): AsyncGenerator<CompletionChunk> {
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages,
      temperature: options.temperature ?? 0.7,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { content: event.delta.text };
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    this.logger.warn('Anthropic does not support embeddings; using fallback');
    return new Array(1536).fill(0);
  }
}
