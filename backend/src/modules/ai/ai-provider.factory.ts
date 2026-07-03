import { Injectable, BadRequestException } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AIProvider } from './interfaces/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';

/**
 * Factory for resolving AI providers by name.
 */
@Injectable()
export class AIProviderFactory {
  private readonly providers: Map<Provider, AIProvider>;

  constructor(
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    gemini: GeminiProvider,
    deepseek: DeepSeekProvider,
    ollama: OllamaProvider,
  ) {
    this.providers = new Map<Provider, AIProvider>([
      [Provider.OPENAI, openai],
      [Provider.ANTHROPIC, anthropic],
      [Provider.GEMINI, gemini],
      [Provider.DEEPSEEK, deepseek],
      [Provider.OLLAMA, ollama],
    ]);
  }

  /**
   * Get a provider instance by enum value.
   */
  getProvider(provider: Provider): AIProvider {
    const instance = this.providers.get(provider);
    if (!instance) {
      throw new BadRequestException(`Provider ${provider} not supported`);
    }
    return instance;
  }

  /**
   * List all available providers and their models.
   */
  listProviders(): Array<{ name: Provider; models: string[] }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      models: provider.models,
    }));
  }
}
