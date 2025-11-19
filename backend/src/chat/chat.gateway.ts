import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { GroupsService } from '../groups/groups.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateMessageDto } from '../messages/dto/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private messagesService: MessagesService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Store userId in socket data
      client.data.userId = userId;

      // Update user online status
      await this.usersService.updateOnlineStatus(userId, 'online');

      // Join user's personal room for notifications
      client.join(`user:${userId}`);

      // Get user's groups and join rooms
      const groups = await this.groupsService.findAll(userId);
      groups.forEach(group => {
        client.join(`group:${group.id}`);
      });

      // Notify user's groups that they're online
      groups.forEach(group => {
        this.server.to(`group:${group.id}`).emit('user:online', {
          userId,
          groupId: group.id,
        });
      });

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      // Remove socket from user's connections
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);

        // If user has no more connections, mark as offline
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          await this.usersService.updateOnlineStatus(userId, 'offline');

          // Get user's groups and notify them
          try {
            const groups = await this.groupsService.findAll(userId);
            groups.forEach(group => {
              this.server.to(`group:${group.id}`).emit('user:offline', {
                userId,
                groupId: group.id,
              });
            });
          } catch (error) {
            this.logger.error('Error notifying offline status:', error);
          }
        }
      }

      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      // Create message in database
      const message = await this.messagesService.create(userId, data);

      // Broadcast to all clients in the group room
      this.server.to(`group:${data.groupId}`).emit('message:new', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    client.to(`group:${data.groupId}`).emit('typing:start', {
      userId,
      groupId: data.groupId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    client.to(`group:${data.groupId}`).emit('typing:stop', {
      userId,
      groupId: data.groupId,
    });
  }

  @SubscribeMessage('group:join')
  async handleJoinGroup(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      // Verify user is member of group
      await this.groupsService.findOne(data.groupId, userId);

      // Join the room
      client.join(`group:${data.groupId}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('group:leave')
  async handleLeaveGroup(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`group:${data.groupId}`);
    return { success: true };
  }

  // Public method for sending notifications to specific users
  async notifyUserAddedToGroup(userId: string, groupId: string, groupName: string, invitedBy: string) {
    // Save notification to database
    const notification = await this.notificationsService.create({
      userId,
      type: NotificationType.GROUP_INVITATION,
      title: 'New Group Invitation',
      message: `You have been added to the group "${groupName}"`,
      groupId,
      actorId: invitedBy,
    });

    // Send real-time notification via WebSocket
    this.server.to(`user:${userId}`).emit('notification:group-invitation', {
      ...notification,
      type: 'group_invitation',
      groupId,
      groupName,
      invitedBy,
      timestamp: new Date(),
    });

    this.logger.log(`Sent group invitation notification to user ${userId} for group ${groupId}`);
  }

  // Public method for notifying group members about incoming calls
  notifyCallCreated(groupId: string, call: any) {
    this.server.to(`group:${groupId}`).emit('call:incoming', {
      callId: call.id,
      groupId: call.groupId,
      initiatedBy: call.initiatedById,
      type: call.type,
      timestamp: new Date(),
    });

    this.logger.log(`Sent call notification to group ${groupId}, call ${call.id}`);
  }
}
