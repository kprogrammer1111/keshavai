import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../ai/ai.service';
import { StorageService } from '../files/storage.service';
import * as mammoth from 'mammoth';
import { parse as parseCsv } from 'csv-parse/sync';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * RAG service for document ingestion, chunking, embedding, and retrieval.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Process an uploaded document: extract text, chunk, embed, store.
   */
  async processDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) return;

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      const buffer = await this.storage.download(document.s3Key);
      const text = await this.extractText(buffer, document.fileType);
      const chunks = this.chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.aiService.embed(Provider.OPENAI, chunks[i]);
        const vectorStr = `[${embedding.join(',')}]`;

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO embeddings (id, document_id, content, chunk_index, vector, created_at)
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector, NOW())`,
          documentId,
          chunks[i],
          i,
          vectorStr,
        );
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED', chunkCount: chunks.length },
      });
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}`, error);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
    }
  }

  /**
   * Retrieve relevant document chunks for a query.
   */
  async retrieve(
    userId: string,
    query: string,
    limit = 5,
  ): Promise<Array<{ content: string; score: number }>> {
    const embedding = await this.aiService.embed(Provider.OPENAI, query);
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await this.prisma.$queryRawUnsafe<
      Array<{ content: string; score: number }>
    >(
      `SELECT e.content, 1 - (e.vector <=> $1::vector) as score
       FROM embeddings e
       JOIN documents d ON d.id = e.document_id
       WHERE d.user_id = $2::uuid AND d.status = 'COMPLETED'
       ORDER BY e.vector <=> $1::vector
       LIMIT $3`,
      vectorStr,
      userId,
      limit,
    );

    return results;
  }

  private async extractText(buffer: Buffer, fileType: string): Promise<string> {
    switch (fileType) {
      case 'application/pdf': {
        return this.extractPdfText(buffer);
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      case 'text/plain':
      case 'text/markdown':
        return buffer.toString('utf-8');
      case 'text/csv': {
        const records = parseCsv(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
        return records.map((r) => Object.values(r).join(', ')).join('\n');
      }
      default:
        return buffer.toString('utf-8');
    }
  }

  /** Lazy-load pdf-parse so the server can start without loading pdfjs at boot. */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    const pdfParse = (await import('pdf-parse')).default as (
      buf: Buffer,
    ) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end).trim());
      start = end - CHUNK_OVERLAP;
      if (start >= text.length - CHUNK_OVERLAP) break;
    }

    return chunks.filter((c) => c.length > 0);
  }
}
