import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import {
  CreateChatDto,
  UpdateChatDto,
  SendMessageDto,
  EditMessageDto,
} from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateChatDto) {
    return this.chatService.createChat(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user chats' })
  list(
    @CurrentUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getChats(userId, page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search chats' })
  search(
    @CurrentUser('sub') userId: string,
    @Query('q') query: string,
  ) {
    return this.chatService.searchChats(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat with messages' })
  get(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.chatService.getChat(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat (rename, pin)' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChatDto,
  ) {
    return this.chatService.updateChat(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat' })
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.chatService.deleteChat(userId, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export chat as markdown' })
  export(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.chatService.exportChat(userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message and stream response (SSE)' })
  sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    return this.chatService.streamMessage(userId, id, dto, res);
  }

  @Post(':id/messages/:messageId/regenerate')
  @ApiOperation({ summary: 'Regenerate assistant response' })
  regenerate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Res() res: Response,
  ) {
    return this.chatService.regenerateMessage(userId, id, messageId, res);
  }

  @Patch(':id/messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  editMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(userId, id, messageId, dto.content);
  }
}
