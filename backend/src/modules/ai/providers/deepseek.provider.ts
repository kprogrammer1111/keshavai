import { Injectable } from '@nestjs/common';
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
 * DeepSeek provider using OpenAI-compatible API.
 */
@Injectable()
export class DeepSeekProvider implements AIProvider {
  readonly name = Provider.DEEPSEEK;
  readonly models = ['deepseek-chat', 'deepseek-reasoner'];

  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey:
        this.configService.get<string>('app.ai.deepseek.apiKey') ||
        'sk-not-configured',
      baseURL: this.configService.get<string>('app.ai.deepseek.baseUrl'),
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: toOpenAIMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? '',
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
      stream: true,
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.choices[0]?.delta?.content ?? undefined,
      };
    }
  }

  async embed(text: string): Promise<number[]> {
    return new Array(1536).fill(0);
  }
}
