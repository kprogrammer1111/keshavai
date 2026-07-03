import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { AIModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [AIModule, FilesModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
