import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Call } from './call.entity';
import { User } from '../../users/entities/user.entity';

@Entity('call_participants')
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  callId: string;

  @ManyToOne(() => Call, (call) => call.participants)
  @JoinColumn({ name: 'callId' })
  call: Call;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ default: true })
  isAudioEnabled: boolean;

  @Column({ default: true })
  isVideoEnabled: boolean;

  @Column({ default: false })
  isScreenSharing: boolean;
}
