import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';

export enum CallStatus {
  WAITING = 'waiting',      // Call created, waiting for participants
  ACTIVE = 'active',         // Call is ongoing
  ENDED = 'ended',           // Call ended normally
  CANCELLED = 'cancelled',   // Call was cancelled before starting
  FAILED = 'failed',         // Call failed due to error
}

export enum CallType {
  AUDIO = 'audio',           // Audio only
  VIDEO = 'video',           // Audio + Video
  SCREEN_SHARE = 'screen',   // Screen sharing
}

/**
 * Call Entity
 *
 * Represents a voice/video call session in a group.
 * Tracks participants, duration, and call metadata.
 *
 * Phase 3 Implementation
 */
@Entity('calls')
@Index(['groupId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Call {
  @ApiProperty({ description: 'Unique call identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Group where the call is taking place' })
  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ApiProperty({ description: 'User who initiated the call' })
  @Column({ type: 'uuid' })
  initiatedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'initiatedById' })
  initiatedBy: User;

  @ApiProperty({ description: 'Call type', enum: CallType })
  @Column({
    type: 'enum',
    enum: CallType,
    default: CallType.VIDEO,
  })
  type: CallType;

  @ApiProperty({ description: 'Call status', enum: CallStatus })
  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.WAITING,
  })
  status: CallStatus;

  @ApiProperty({ description: 'WebRTC room ID on the media server' })
  @Column({ type: 'varchar', nullable: true })
  webrtcRoomId: string;

  @ApiProperty({ description: 'Array of participant user IDs', type: [String] })
  @Column('simple-array', { default: '' })
  participants: string[];

  @ApiProperty({ description: 'When the call actually started (first participant joined)' })
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @ApiProperty({ description: 'When the call ended' })
  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @ApiProperty({ description: 'Call duration in seconds' })
  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @ApiProperty({ description: 'Maximum concurrent participants' })
  @Column({ type: 'int', default: 0 })
  maxParticipants: number;

  @ApiProperty({ description: 'Additional metadata (JSONB)', required: false })
  @Column('jsonb', { nullable: true })
  metadata: {
    quality?: 'low' | 'medium' | 'high';
    recordingEnabled?: boolean;
    recordingId?: string;
    endReason?: 'normal' | 'timeout' | 'error' | 'cancelled';
    errorMessage?: string;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Call created timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Call updated timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Add a participant to the call
   */
  addParticipant(userId: string): void {
    if (!this.participants.includes(userId)) {
      this.participants.push(userId);
      if (this.participants.length > this.maxParticipants) {
        this.maxParticipants = this.participants.length;
      }
    }
  }

  /**
   * Remove a participant from the call
   */
  removeParticipant(userId: string): void {
    this.participants = this.participants.filter((id) => id !== userId);
  }

  /**
   * Check if user is a participant
   */
  isParticipant(userId: string): boolean {
    return this.participants.includes(userId);
  }

  /**
   * Start the call (first participant joined)
   */
  start(): void {
    if (!this.startedAt) {
      this.startedAt = new Date();
      this.status = CallStatus.ACTIVE;
    }
  }

  /**
   * End the call and calculate duration
   */
  end(reason: 'normal' | 'timeout' | 'error' | 'cancelled' = 'normal'): void {
    if (this.status === CallStatus.ACTIVE || this.status === CallStatus.WAITING) {
      this.endedAt = new Date();
      this.status = reason === 'cancelled' ? CallStatus.CANCELLED : CallStatus.ENDED;

      if (this.startedAt) {
        this.durationSeconds = Math.floor(
          (this.endedAt.getTime() - this.startedAt.getTime()) / 1000,
        );
      }

      this.metadata = {
        ...this.metadata,
        endReason: reason,
      };
    }
  }

  /**
   * Mark call as failed
   */
  fail(errorMessage: string): void {
    this.status = CallStatus.FAILED;
    this.endedAt = new Date();
    this.metadata = {
      ...this.metadata,
      endReason: 'error',
      errorMessage,
    };
  }

  /**
   * Check if call is active
   */
  isActive(): boolean {
    return this.status === CallStatus.ACTIVE;
  }

  /**
   * Check if call has ended
   */
  hasEnded(): boolean {
    return [CallStatus.ENDED, CallStatus.CANCELLED, CallStatus.FAILED].includes(
      this.status,
    );
  }

  /**
   * Get call duration string (HH:MM:SS)
   */
  getDurationString(): string {
    if (!this.durationSeconds) return '00:00:00';

    const hours = Math.floor(this.durationSeconds / 3600);
    const minutes = Math.floor((this.durationSeconds % 3600) / 60);
    const seconds = this.durationSeconds % 60;

    return [hours, minutes, seconds]
      .map((val) => val.toString().padStart(2, '0'))
      .join(':');
  }
}
