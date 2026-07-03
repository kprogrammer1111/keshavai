import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider, MessageRole } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../ai/ai.service';
import { MemoryService } from '../memory/memory.service';
import { RagService } from '../rag/rag.service';
import { ToolRegistry } from '../tools/tool.registry';
import {
  CreateChatDto,
  UpdateChatDto,
  SendMessageDto,
} from './dto/chat.dto';

/**
 * Chat service handling conversations, streaming, and AI interactions.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly memoryService: MemoryService,
    private readonly ragService: RagService,
    private readonly toolRegistry: ToolRegistry,
    private readonly configService: ConfigService,
  ) {}

  private get defaultProvider(): Provider {
    return (this.configService.get<string>('app.ai.defaultProvider') ??
      'GEMINI') as Provider;
  }

  private get defaultModel(): string {
    return (
      this.configService.get<string>('app.ai.defaultModel') ?? 'gemini-2.0-flash'
    );
  }

  async createChat(userId: string, dto: CreateChatDto) {
    return this.prisma.chat.create({
      data: {
        userId,
        title: dto.title ?? 'New Chat',
        provider: dto.provider ?? this.defaultProvider,
        model: dto.model ?? this.defaultModel,
      },
    });
  }

  async getChats(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where: { userId },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        include: {
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.chat.count({ where: { userId } }),
    ]);

    return { chats, total, page, limit };
  }

  async getChat(userId: string, chatId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async updateChat(userId: string, chatId: string, dto: UpdateChatDto) {
    await this.ensureOwnership(userId, chatId);
    return this.prisma.chat.update({
      where: { id: chatId },
      data: dto,
    });
  }

  async deleteChat(userId: string, chatId: string) {
    await this.ensureOwnership(userId, chatId);
    await this.prisma.chat.delete({ where: { id: chatId } });
    return { message: 'Chat deleted' };
  }

  async searchChats(userId: string, query: string) {
    return this.prisma.chat.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          {
            messages: {
              some: { content: { contains: query, mode: 'insensitive' } },
            },
          },
        ],
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async exportChat(userId: string, chatId: string) {
    const chat = await this.getChat(userId, chatId);
    const markdown = [
      `# ${chat.title}`,
      '',
      ...chat.messages.map(
        (m) => `## ${m.role}\n\n${m.content}\n`,
      ),
    ].join('\n');

    return { content: markdown, fileName: `${chat.title}.md` };
  }

  /**
   * Stream AI response via Server-Sent Events.
   */
  async streamMessage(
    userId: string,
    chatId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    await this.ensureOwnership(userId, chatId);

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    const provider = dto.provider ?? this.defaultProvider;
    const model = dto.model ?? this.defaultModel;

    await this.prisma.message.create({
      data: {
        chatId,
        role: MessageRole.USER,
        content: dto.content,
      },
    });

    if (chat.title === 'New Chat') {
      const title = dto.content.slice(0, 50);
      await this.prisma.chat.update({
        where: { id: chatId },
        data: { title },
      });
    }

    let systemPrompt = 'You are a helpful AI assistant.';
    if (dto.useRag) {
      try {
        const chunks = await this.ragService.retrieve(userId, dto.content);
        if (chunks.length > 0) {
          const context = chunks.map((c) => c.content).join('\n\n');
          systemPrompt += `\n\nRelevant context from documents:\n${context}`;
        }
      } catch {
        // Continue without RAG if embeddings or retrieval fail
      }
    }

    const messages = await this.memoryService.buildContext(chatId, systemPrompt);
    messages.push({ role: 'user', content: dto.content });

    const tools = dto.useTools ? this.toolRegistry.getDefinitions() : undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullContent = '';
    let tokenCount = 0;

    try {
      for await (const chunk of this.aiService.stream(userId, provider, {
        model,
        messages,
        tools,
      })) {
        if (chunk.content) {
          fullContent += chunk.content;
          tokenCount += this.aiService.estimateTokens(chunk.content);
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
        }
      }

      await this.prisma.message.create({
        data: {
          chatId,
          role: MessageRole.ASSISTANT,
          content: fullContent,
          model,
          provider,
          tokenCount,
        },
      });

      await this.prisma.chat.update({
        where: { id: chatId },
        data: { provider, model },
      });

      await this.memoryService.maybeSummarize(chatId);

      res.write(`data: ${JSON.stringify({ done: true, tokenCount })}\n\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stream error';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  async regenerateMessage(userId: string, chatId: string, messageId: string, res: Response) {
    await this.ensureOwnership(userId, chatId);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, chatId },
    });
    if (!message) throw new NotFoundException('Message not found');

    const previousUser = await this.prisma.message.findFirst({
      where: {
        chatId,
        role: MessageRole.USER,
        createdAt: { lt: message.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!previousUser) throw new NotFoundException('No user message to regenerate from');

    await this.prisma.message.delete({ where: { id: messageId } });

    return this.streamMessage(
      userId,
      chatId,
      { content: previousUser.content },
      res,
    );
  }

  async editMessage(userId: string, chatId: string, messageId: string, content: string) {
    await this.ensureOwnership(userId, chatId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
    });
  }

  private async ensureOwnership(userId: string, chatId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) throw new ForbiddenException('Access denied');
  }
}
