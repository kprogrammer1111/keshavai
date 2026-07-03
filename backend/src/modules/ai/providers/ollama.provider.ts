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
 * Ollama local models provider.
 */
@Injectable()
export class OllamaProvider implements AIProvider {
  readonly name = Provider.OLLAMA;
  readonly models = ['llama3.2', 'mistral', 'codellama', 'phi3'];

  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: 'ollama',
      baseURL: `${this.configService.get<string>('app.ai.ollama.baseUrl')}/v1`,
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: toOpenAIMessages(options.messages),
      temperature: options.temperature ?? 0.7,
    });

    return {
      content: response.choices[0].message.content ?? '',
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
    const baseUrl = this.configService.get<string>('app.ai.ollama.baseUrl');
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    });
    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }
}
