import { Test, TestingModule } from '@nestjs/testing';
import { AIProviderFactory } from './ai-provider.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { ConfigService } from '@nestjs/config';

describe('AIProviderFactory', () => {
  let factory: AIProviderFactory;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn().mockReturnValue(''),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderFactory,
        { provide: OpenAIProvider, useValue: { name: 'OPENAI', models: ['gpt-4o'] } },
        { provide: AnthropicProvider, useValue: { name: 'ANTHROPIC', models: ['claude-3'] } },
        { provide: GeminiProvider, useValue: { name: 'GEMINI', models: ['gemini-pro'] } },
        { provide: DeepSeekProvider, useValue: { name: 'DEEPSEEK', models: ['deepseek-chat'] } },
        { provide: OllamaProvider, useValue: { name: 'OLLAMA', models: ['llama3'] } },
      ],
    }).compile();

    factory = module.get<AIProviderFactory>(AIProviderFactory);
  });

  it('should list all providers', () => {
    const providers = factory.listProviders();
    expect(providers).toHaveLength(5);
  });
});
