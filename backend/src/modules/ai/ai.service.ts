import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AIProviderFactory } from './ai-provider.factory';
import {
  CompletionOptions,
  CompletionChunk,
  ChatMessage,
} from './interfaces/ai-provider.interface';

/**
 * High-level AI service orchestrating providers, usage tracking, and completions.
 */
@Injectable()
export class AIService {
  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * List all available AI providers and models.
   */
  listProviders() {
    return this.providerFactory.listProviders();
  }

  /**
   * Generate a non-streaming completion.
   */
  async complete(
    userId: string,
    provider: Provider,
    options: Omit<CompletionOptions, 'stream'>,
  ) {
    const aiProvider = this.providerFactory.getProvider(provider);
    const result = await aiProvider.complete(options);

    if (result.usage) {
      await this.trackUsage(userId, provider, options.model, result.usage);
    }

    return result;
  }

  /**
   * Stream a completion with usage tracking on finish.
   */
  async *stream(
    userId: string,
    provider: Provider,
    options: Omit<CompletionOptions, 'stream'>,
  ): AsyncGenerator<CompletionChunk> {
    const aiProvider = this.providerFactory.getProvider(provider);
    let lastUsage: CompletionChunk['usage'];

    for await (const chunk of aiProvider.stream(options)) {
      if (chunk.usage) lastUsage = chunk.usage;
      yield chunk;
    }

    if (lastUsage) {
      await this.trackUsage(userId, provider, options.model, lastUsage);
    }
  }

  /**
   * Generate embeddings for RAG.
   */
  async embed(provider: Provider, text: string): Promise<number[]> {
    const aiProvider = this.providerFactory.getProvider(provider);
    return aiProvider.embed(text);
  }

  /**
   * Estimate token count for a string (rough approximation).
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async trackUsage(
    userId: string,
    provider: Provider,
    model: string,
    usage: NonNullable<CompletionChunk['usage']>,
  ): Promise<void> {
    await this.prisma.usage.create({
      data: {
        userId,
        provider,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });
  }
}
