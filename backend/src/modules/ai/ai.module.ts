import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { AIProviderFactory } from './ai-provider.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    AIProviderFactory,
    OpenAIProvider,
    AnthropicProvider,
    GeminiProvider,
    DeepSeekProvider,
    OllamaProvider,
  ],
  exports: [AIService, AIProviderFactory],
})
export class AIModule {}
