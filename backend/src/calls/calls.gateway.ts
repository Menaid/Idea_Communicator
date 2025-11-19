import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { JoinCallDto } from './dto/join-call.dto';
import { CallSignalDto } from './dto/call-signal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * CallsGateway
 *
 * WebSocket gateway for real-time call signaling
 * - Call participant notifications
 * - WebRTC signaling (offer/answer/ICE candidates)
 * - Participant join/leave events
 *
 * Phase 3 Implementation
 */
@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  // Track active connections: userId -> Set of socket IDs
  private activeConnections = new Map<string, Set<string>>();

  // Track call rooms: callId -> Set of socket IDs
  private callRooms = new Map<string, Set<string>>();

  constructor(private readonly callsService: CallsService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract userId from socket (set by JWT auth guard)
      const userId = client.data.userId;

      if (!userId) {
        this.logger.warn(`Client ${client.id} connected without userId`);
        client.disconnect();
        return;
      }

      // Track connection
      if (!this.activeConnections.has(userId)) {
        this.activeConnections.set(userId, new Set());
      }
      this.activeConnections.get(userId)!.add(client.id);

      this.logger.log(`User ${userId} connected to calls gateway (${client.id})`);

      // Send active calls to user
      const activeCalls = await this.callsService.findActiveCallsForUser(userId);
      client.emit('active-calls', activeCalls);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;

      if (!userId) return;

      // Remove from active connections
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.activeConnections.delete(userId);
        }
      }

      // Find and leave any active calls
      for (const [callId, socketIds] of this.callRooms.entries()) {
        if (socketIds.has(client.id)) {
          socketIds.delete(client.id);

          // Leave the call in the database
          try {
            const call = await this.callsService.leave(callId, userId);

            // Notify other participants
            this.server.to(callId).emit('participant-left', {
              callId,
              userId,
              participantCount: call.participants.length,
            });

            // Clean up empty rooms
            if (socketIds.size === 0) {
              this.callRooms.delete(callId);
            }
          } catch (error) {
            this.logger.error(`Error leaving call ${callId}: ${error.message}`);
          }
        }
      }

      this.logger.log(`User ${userId} disconnected from calls gateway (${client.id})`);
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`, error.stack);
    }
  }

  /**
   * Join a call room
   */
  @SubscribeMessage('call:join')
  async handleJoinCall(
    @MessageBody() joinCallDto: JoinCallDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const { callId } = joinCallDto;

      this.logger.log(`User ${userId} joining call ${callId}`);

      // Join the call in the database
      const call = await this.callsService.join(callId, userId);

      // Join the Socket.IO room
      client.join(callId);

      // Track in call rooms
      if (!this.callRooms.has(callId)) {
        this.callRooms.set(callId, new Set());
      }
      this.callRooms.get(callId)!.add(client.id);

      // Notify other participants
      this.server.to(callId).emit('participant-joined', {
        callId,
        userId,
        user: call.initiatedBy, // Will be enhanced with full user data
        participantCount: call.participants.length,
      });

      // Send current participants to the joining user
      client.emit('call:joined', {
        call,
        participants: call.participants,
      });

      return { success: true, call };
    } catch (error) {
      this.logger.error(`Error joining call: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a call room
   */
  @SubscribeMessage('call:leave')
  async handleLeaveCall(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const { callId } = data;

      this.logger.log(`User ${userId} leaving call ${callId}`);

      // Leave the call in the database
      const call = await this.callsService.leave(callId, userId);

      // Leave the Socket.IO room
      client.leave(callId);

      // Remove from call rooms tracking
      const socketIds = this.callRooms.get(callId);
      if (socketIds) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.callRooms.delete(callId);
        }
      }

      // Notify other participants
      this.server.to(callId).emit('participant-left', {
        callId,
        userId,
        participantCount: call.participants.length,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving call: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle WebRTC signaling messages
   *
   * These are forwarded to the WebRTC media server and/or other participants
   */
  @SubscribeMessage('call:signal')
  async handleSignal(
    @MessageBody() signalDto: CallSignalDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const { callId, type, payload, targetUserId } = signalDto;

      this.logger.debug(
        `Signal ${type} from user ${userId} in call ${callId}`,
      );

      // Validate that user is in the call
      const call = await this.callsService.findOne(callId, userId);
      if (!call.isParticipant(userId)) {
        return { success: false, error: 'Not a participant in this call' };
      }

      // If target user specified, send directly to them
      if (targetUserId) {
        const targetSockets = this.activeConnections.get(targetUserId);
        if (targetSockets) {
          for (const socketId of targetSockets) {
            this.server.to(socketId).emit('call:signal', {
              callId,
              fromUserId: userId,
              type,
              payload,
            });
          }
        }
      } else {
        // Broadcast to all participants in the call (except sender)
        client.to(callId).emit('call:signal', {
          callId,
          fromUserId: userId,
          type,
          payload,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling signal: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify participants when a call is created
   */
  notifyCallCreated(groupId: string, call: any) {
    this.server.emit('call:created', {
      groupId,
      call,
    });
  }

  /**
   * Notify participants when a call ends
   */
  notifyCallEnded(callId: string, reason: string) {
    this.server.to(callId).emit('call:ended', {
      callId,
      reason,
    });
  }
}
