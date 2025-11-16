import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message to a group' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async create(@Request() req: ExpressRequest & { user: any }, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(req.user.id, createMessageDto);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get messages for a group' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'before', required: false, description: 'Message ID for pagination' })
  @ApiResponse({ status: 200, description: 'Returns messages' })
  async findByGroup(
    @Request() req: ExpressRequest & { user: any },
    @Param('groupId') groupId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.findByGroup(groupId, req.user.id, limit, before);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: 200, description: 'Returns message' })
  async findOne(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    return this.messagesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Only sender can edit' })
  async update(
    @Request() req: ExpressRequest & { user: any },
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, req.user.id, updateMessageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only sender can delete' })
  async remove(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    await this.messagesService.remove(id, req.user.id);
    return { message: 'Message deleted successfully' };
  }
}
