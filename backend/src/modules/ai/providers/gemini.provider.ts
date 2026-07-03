import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider } from '@prisma/client';
import {
  AIProvider,
  CompletionOptions,
  CompletionChunk,
  CompletionResult,
} from '../interfaces/ai-provider.interface';

/**
 * Google Gemini provider.
 */
@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = Provider.GEMINI;
  readonly models = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
  ];

  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('app.ai.gemini.apiKey') ?? '',
    );
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const model = this.genAI.getGenerativeModel({ model: options.model });
    const history = options.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = options.messages[options.messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async *stream(options: CompletionOptions): AsyncGenerator<CompletionChunk> {
    const model = this.genAI.getGenerativeModel({ model: options.model });
    const lastMessage = options.messages[options.messages.length - 1];
    const result = await model.generateContentStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { content: text };
    }
  }

  async embed(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-embedding-001',
    });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
