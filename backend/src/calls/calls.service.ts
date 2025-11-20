import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Call, CallStatus, CallType } from './entities/call.entity';
import { CreateCallDto } from './dto/create-call.dto';
import { GroupsService } from '../groups/groups.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditAction } from '../common/entities/audit-log.entity';

/**
 * CallsService
 *
 * Handles business logic for voice/video calls
 * - Creating and managing calls
 * - Participant tracking
 * - Call state management
 * - Integration with Groups
 *
 * Phase 3 Implementation
 */
@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectRepository(Call)
    private callRepository: Repository<Call>,
    private groupsService: GroupsService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new call in a group
   */
  async create(createCallDto: CreateCallDto, userId: string): Promise<Call> {
    const { groupId, type = CallType.VIDEO, metadata = {} } = createCallDto;

    // Validate that user is a member of the group
    const group = await this.groupsService.findOne(groupId, userId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if there's already an active call in this group
    const existingCall = await this.findActiveCallByGroup(groupId);
    if (existingCall) {
      throw new BadRequestException(
        'There is already an active call in this group',
      );
    }

    // Create the call
    const call = this.callRepository.create({
      groupId,
      initiatedById: userId,
      type,
      status: CallStatus.WAITING,
      participants: [userId], // Creator is automatically added
      maxParticipants: 1,
      metadata,
    });

    const savedCall = await this.callRepository.save(call);

    // Audit log
    await this.auditLogService.log({
      userId,
      action: AuditAction.CALL_STARTED,
      entityType: 'call',
      entityId: savedCall.id,
      metadata: {
        groupId,
        type,
      },
      success: true,
    });

    this.logger.log(
      `[CREATE] Call ${savedCall.id} created in group ${groupId} by user ${userId} - Status: ${savedCall.status}`,
    );
    console.log('[CREATE] Saved call details:', {
      id: savedCall.id,
      groupId: savedCall.groupId,
      status: savedCall.status,
      participants: savedCall.participants,
      createdAt: savedCall.createdAt,
    });

    return savedCall;
  }

  /**
   * Find a call by ID
   */
  async findOne(callId: string, userId?: string): Promise<Call> {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // If userId provided, validate access
    if (userId) {
      const group = await this.groupsService.findOne(call.groupId, userId);
      if (!group) {
        throw new ForbiddenException('You do not have access to this call');
      }
    }

    return call;
  }

  /**
   * Find active or waiting call in a group
   * IMPORTANT: Includes WAITING status to catch calls that haven't been joined yet
   */
  async findActiveCallByGroup(groupId: string): Promise<Call | null> {
    this.logger.log(`[findActiveCallByGroup] Searching for active/waiting call in group ${groupId}`);

    const call = await this.callRepository.findOne({
      where: {
        groupId,
        status: In([CallStatus.ACTIVE, CallStatus.WAITING]),
      },
      order: {
        createdAt: 'DESC', // Get most recent if multiple exist
      },
    });

    this.logger.log(`[findActiveCallByGroup] Result for group ${groupId}:`, {
      found: !!call,
      callId: call?.id,
      status: call?.status,
      createdAt: call?.createdAt,
      participants: call?.participants,
    });

    return call;
  }

  /**
   * Get all calls for a group (history)
   */
  async findByGroup(
    groupId: string,
    userId: string,
    limit: number = 50,
  ): Promise<Call[]> {
    // Validate access
    await this.groupsService.findOne(groupId, userId);

    return this.callRepository.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Join a call (add participant)
   */
  async join(callId: string, userId: string): Promise<Call> {
    const call = await this.findOne(callId);

    // Validate user is a group member
    await this.groupsService.findOne(call.groupId, userId);

    // Check call status
    if (call.hasEnded()) {
      throw new BadRequestException('This call has ended');
    }

    // Add participant
    call.addParticipant(userId);

    // Start the call if it was waiting
    if (call.status === CallStatus.WAITING) {
      call.start();
    }

    const updatedCall = await this.callRepository.save(call);

    this.logger.log(`User ${userId} joined call ${callId}`);

    return updatedCall;
  }

  /**
   * Leave a call (remove participant)
   */
  async leave(callId: string, userId: string): Promise<Call> {
    const call = await this.findOne(callId);

    // Remove participant
    call.removeParticipant(userId);

    // If no participants left, end the call
    if (call.participants.length === 0 && call.isActive()) {
      call.end('normal');
      this.logger.log(`Call ${callId} ended - no participants remaining`);

      await this.auditLogService.log({
        userId,
        action: AuditAction.CALL_ENDED,
        entityType: 'call',
        entityId: callId,
        metadata: {
          duration: call.durationSeconds,
          reason: 'no_participants',
        },
        success: true,
      });
    }

    const updatedCall = await this.callRepository.save(call);

    this.logger.log(`User ${userId} left call ${callId}`);

    return updatedCall;
  }

  /**
   * End a call
   */
  async end(
    callId: string,
    userId: string,
    reason: 'normal' | 'timeout' | 'error' | 'cancelled' = 'normal',
  ): Promise<Call> {
    const call = await this.findOne(callId, userId);

    // Only initiator or group admin can end the call
    const group = await this.groupsService.findOne(call.groupId, userId);
    const isAdmin = group.members.some(
      (m) => m.userId === userId && m.role === 'admin',
    );
    const isInitiator = call.initiatedById === userId;

    if (!isInitiator && !isAdmin) {
      throw new ForbiddenException(
        'Only the call initiator or group admin can end the call',
      );
    }

    // End the call
    call.end(reason);
    const updatedCall = await this.callRepository.save(call);

    // Audit log
    await this.auditLogService.log({
      userId,
      action: AuditAction.CALL_ENDED,
      entityType: 'call',
      entityId: callId,
      metadata: {
        duration: call.durationSeconds,
        reason,
        maxParticipants: call.maxParticipants,
      },
      success: true,
    });

    this.logger.log(`Call ${callId} ended by user ${userId} - reason: ${reason}`);

    return updatedCall;
  }

  /**
   * Update call WebRTC room ID (set by WebRTC service)
   */
  async setWebRtcRoomId(callId: string, webrtcRoomId: string): Promise<Call> {
    const call = await this.findOne(callId);
    call.webrtcRoomId = webrtcRoomId;
    return this.callRepository.save(call);
  }

  /**
   * Update call metadata
   */
  async updateMetadata(
    callId: string,
    metadata: Record<string, any>,
  ): Promise<Call> {
    const call = await this.findOne(callId);
    call.metadata = {
      ...call.metadata,
      ...metadata,
    };
    return this.callRepository.save(call);
  }

  /**
   * Get active calls for a user (across all their groups)
   */
  async findActiveCallsForUser(userId: string): Promise<Call[]> {
    // Get all groups user is member of
    const groups = await this.groupsService.findAll(userId);
    const groupIds = groups.map((g) => g.id);

    if (groupIds.length === 0) {
      return [];
    }

    return this.callRepository
      .createQueryBuilder('call')
      .where('call.groupId IN (:...groupIds)', { groupIds })
      .andWhere('call.status = :status', { status: CallStatus.ACTIVE })
      .orderBy('call.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Cleanup stale calls (calls that have been active for too long)
   * Should be called by a scheduled job
   */
  async cleanupStaleCalls(maxDurationHours: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxDurationHours);

    const staleCalls = await this.callRepository
      .createQueryBuilder('call')
      .where('call.status = :status', { status: CallStatus.ACTIVE })
      .andWhere('call.startedAt < :cutoffTime', { cutoffTime })
      .getMany();

    for (const call of staleCalls) {
      call.end('timeout');
      await this.callRepository.save(call);
      this.logger.warn(`Cleaned up stale call ${call.id} (started at ${call.startedAt})`);
    }

    return staleCalls.length;
  }
}
