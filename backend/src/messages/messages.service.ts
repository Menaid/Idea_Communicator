import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
  ) {}

  async create(userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    // Verify user is member of the group
    await this.groupsService.findOne(createMessageDto.groupId, userId);

    const message = this.messagesRepository.create({
      ...createMessageDto,
      senderId: userId,
      type: createMessageDto.type || 'text',
    });

    return this.messagesRepository.save(message);
  }

  async findByGroup(
    groupId: string,
    userId: string,
    limit: number = 50,
    before?: string,
  ): Promise<Message[]> {
    // Verify user is member of the group
    await this.groupsService.findOne(groupId, userId);

    const query: any = {
      groupId,
      isDeleted: false,
    };

    if (before) {
      // Get messages before this message ID (pagination)
      const beforeMessage = await this.messagesRepository.findOne({
        where: { id: before },
      });
      if (beforeMessage) {
        query.createdAt = LessThan(beforeMessage.createdAt);
      }
    }

    return this.messagesRepository.find({
      where: query,
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string, userId: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['sender', 'group'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is member of the group
    await this.groupsService.findOne(message.groupId, userId);

    return message;
  }

  async update(id: string, userId: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const message = await this.findOne(id, userId);

    // Only the sender can edit their message
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = updateMessageDto.content;
    message.isEdited = true;
    return this.messagesRepository.save(message);
  }

  async remove(id: string, userId: string): Promise<void> {
    const message = await this.findOne(id, userId);

    // Only the sender can delete their message
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.content = '[Deleted]';
    await this.messagesRepository.save(message);
  }
}
