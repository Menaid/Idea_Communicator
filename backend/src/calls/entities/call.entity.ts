import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';
import { CallParticipant } from './call-participant.entity';

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum CallStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groupId: string;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column('uuid')
  initiatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatorId' })
  initiator: User;

  @Column({
    type: 'enum',
    enum: CallType,
    default: CallType.VIDEO,
  })
  type: CallType;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.ACTIVE,
  })
  status: CallStatus;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @OneToMany(() => CallParticipant, (participant) => participant.call, {
    cascade: true,
  })
  participants: CallParticipant[];

  @UpdateDateColumn()
  updatedAt: Date;
}
