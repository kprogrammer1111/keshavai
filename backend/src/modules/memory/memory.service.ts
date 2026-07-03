import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../ai/ai.service';
import { ChatMessage } from '../ai/interfaces/ai-provider.interface';

const MAX_CONTEXT_TOKENS = 8000;
const SUMMARY_THRESHOLD = 20;

/**
 * Memory service managing short-term, long-term, and conversation summaries.
 */
@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Build optimized context window for a chat.
   */
  async buildContext(
    chatId: string,
    systemPrompt?: string,
  ): Promise<ChatMessage[]> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
    });

    if (!chat) return [];

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (chat.summary) {
      messages.push({
        role: 'system',
        content: `Previous conversation summary: ${chat.summary}`,
      });
    }

    let tokenCount = messages.reduce(
      (sum, m) => sum + this.aiService.estimateTokens(m.content),
      0,
    );

    const chatMessages = chat.messages
      .filter((m) => m.role !== 'TOOL')
      .map((m) => ({
        role: m.role.toLowerCase() as ChatMessage['role'],
        content: m.content,
      }));

    const selected: ChatMessage[] = [];
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.aiService.estimateTokens(chatMessages[i].content);
      if (tokenCount + msgTokens > MAX_CONTEXT_TOKENS) break;
      selected.unshift(chatMessages[i]);
      tokenCount += msgTokens;
    }

    messages.push(...selected);
    return messages;
  }

  /**
   * Summarize conversation when message count exceeds threshold.
   */
  async maybeSummarize(chatId: string): Promise<void> {
    const messageCount = await this.prisma.message.count({
      where: { chatId },
    });

    if (messageCount < SUMMARY_THRESHOLD) return;

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: SUMMARY_THRESHOLD,
    });

    const conversation = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat?.provider) return;

    const result = await this.aiService.complete(chat.userId, chat.provider, {
      model:
        chat.model ??
        this.configService.get<string>('app.ai.defaultModel') ??
        'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'Summarize the following conversation concisely, preserving key facts and decisions.',
        },
        { role: 'user', content: conversation },
      ],
      maxTokens: 500,
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { summary: result.content },
    });
  }
}
