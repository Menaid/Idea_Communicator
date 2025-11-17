import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Call, CallStatus } from './entities/call.entity';
import { CallParticipant } from './entities/call-participant.entity';
import { StartCallDto } from './dto/start-call.dto';
import { JoinCallDto } from './dto/join-call.dto';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private callsRepository: Repository<Call>,
    @InjectRepository(CallParticipant)
    private participantsRepository: Repository<CallParticipant>,
    private groupsService: GroupsService,
  ) {}

  async startCall(userId: string, startCallDto: StartCallDto): Promise<Call> {
    // Verify user is member of the group
    await this.groupsService.findOne(startCallDto.groupId, userId);

    // Check if there's already an active call in this group
    const existingCall = await this.callsRepository.findOne({
      where: {
        groupId: startCallDto.groupId,
        status: CallStatus.ACTIVE,
      },
    });

    if (existingCall) {
      throw new BadRequestException('There is already an active call in this group');
    }

    // Create new call
    const call = this.callsRepository.create({
      ...startCallDto,
      initiatorId: userId,
      status: CallStatus.ACTIVE,
    });

    const savedCall = await this.callsRepository.save(call);

    // Add initiator as first participant
    const participant = this.participantsRepository.create({
      callId: savedCall.id,
      userId: userId,
      isAudioEnabled: true,
      isVideoEnabled: startCallDto.type === 'video',
    });

    await this.participantsRepository.save(participant);

    return this.findOne(savedCall.id, userId);
  }

  async joinCall(
    callId: string,
    userId: string,
    joinCallDto: JoinCallDto = {},
  ): Promise<CallParticipant> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['group'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.status !== CallStatus.ACTIVE) {
      throw new BadRequestException('Call is not active');
    }

    // Verify user is member of the group
    await this.groupsService.findOne(call.groupId, userId);

    // Check if user is already in the call
    const existingParticipant = await this.participantsRepository.findOne({
      where: { callId, userId, leftAt: IsNull() },
    });

    if (existingParticipant) {
      throw new BadRequestException('User is already in the call');
    }

    // Create participant
    const participant = this.participantsRepository.create({
      callId,
      userId,
      isAudioEnabled: joinCallDto.isAudioEnabled ?? true,
      isVideoEnabled: joinCallDto.isVideoEnabled ?? call.type === 'video',
    });

    return this.participantsRepository.save(participant);
  }

  async leaveCall(callId: string, userId: string): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: { callId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in this call');
    }

    participant.leftAt = new Date();
    await this.participantsRepository.save(participant);

    // Check if this was the last participant
    const activeParticipants = await this.participantsRepository.count({
      where: { callId, leftAt: IsNull() },
    });

    if (activeParticipants === 0) {
      // End the call if no participants left
      await this.endCall(callId);
    }
  }

  async endCall(callId: string): Promise<void> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    call.status = CallStatus.ENDED;
    call.endedAt = new Date();
    await this.callsRepository.save(call);

    // Mark all active participants as left
    await this.participantsRepository
      .createQueryBuilder()
      .update(CallParticipant)
      .set({ leftAt: new Date() })
      .where('callId = :callId', { callId })
      .andWhere('leftAt IS NULL')
      .execute();
  }

  async findOne(callId: string, userId: string): Promise<Call> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['group', 'initiator', 'participants', 'participants.user'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Verify user has access to this call (must be member of the group)
    await this.groupsService.findOne(call.groupId, userId);

    return call;
  }

  async findActiveCallInGroup(groupId: string, userId: string): Promise<Call | null> {
    // Verify user is member of the group
    await this.groupsService.findOne(groupId, userId);

    return this.callsRepository.findOne({
      where: {
        groupId,
        status: CallStatus.ACTIVE,
      },
      relations: ['participants', 'participants.user'],
    });
  }

  async getCallHistory(groupId: string, userId: string, limit: number = 20): Promise<Call[]> {
    // Verify user is member of the group
    await this.groupsService.findOne(groupId, userId);

    return this.callsRepository.find({
      where: { groupId },
      relations: ['initiator', 'participants', 'participants.user'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  async updateParticipantMedia(
    callId: string,
    userId: string,
    isAudioEnabled?: boolean,
    isVideoEnabled?: boolean,
    isScreenSharing?: boolean,
  ): Promise<CallParticipant> {
    const participant = await this.participantsRepository.findOne({
      where: { callId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in active call');
    }

    if (isAudioEnabled !== undefined) {
      participant.isAudioEnabled = isAudioEnabled;
    }
    if (isVideoEnabled !== undefined) {
      participant.isVideoEnabled = isVideoEnabled;
    }
    if (isScreenSharing !== undefined) {
      participant.isScreenSharing = isScreenSharing;
    }

    return this.participantsRepository.save(participant);
  }
}
