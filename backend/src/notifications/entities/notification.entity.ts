import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

export enum NotificationType {
  GROUP_INVITATION = 'group_invitation',
  NEW_MESSAGE = 'new_message',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
}

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ enum: NotificationType })
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  @Column({ type: 'text' })
  title: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  message: string;

  @ApiProperty()
  @Column({ type: 'uuid', nullable: true })
  groupId: string;

  @ApiProperty({ type: () => Group, required: false })
  @ManyToOne(() => Group, { eager: true, nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ApiProperty()
  @Column({ type: 'uuid', nullable: true })
  actorId: string;

  @ApiProperty({ type: () => User, required: false })
  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
