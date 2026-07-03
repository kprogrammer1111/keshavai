import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { RagService } from './rag.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
];

@ApiTags('RAG')
@Controller('documents')
export class RagController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ragService: RagService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document for RAG' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const { key } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'documents',
    );

    const document = await this.prisma.document.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        s3Key: key,
      },
    });

    this.ragService.processDocument(document.id).catch(() => {});

    return document;
  }

  @Get()
  @ApiOperation({ summary: 'List user documents' })
  async list(@CurrentUser('sub') userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new BadRequestException('Document not found');

    await this.storage.delete(doc.s3Key);
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document deleted' };
  }
}
