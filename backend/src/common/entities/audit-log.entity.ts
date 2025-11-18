import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  // User actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  EMAIL_VERIFIED = 'email_verified',

  // GDPR actions
  GDPR_CONSENT_GIVEN = 'gdpr_consent_given',
  GDPR_CONSENT_WITHDRAWN = 'gdpr_consent_withdrawn',
  DATA_EXPORT_REQUESTED = 'data_export_requested',
  DATA_EXPORT_COMPLETED = 'data_export_completed',
  DELETION_REQUESTED = 'deletion_requested',
  DELETION_COMPLETED = 'deletion_completed',
  DATA_RETENTION_EXTENDED = 'data_retention_extended',

  // Recording actions
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
  RECORDING_CONSENT_GIVEN = 'recording_consent_given',
  RECORDING_ACCESSED = 'recording_accessed',
  RECORDING_DELETED = 'recording_deleted',

  // Group actions
  GROUP_CREATED = 'group_created',
  GROUP_UPDATED = 'group_updated',
  GROUP_DELETED = 'group_deleted',
  USER_ADDED_TO_GROUP = 'user_added_to_group',
  USER_REMOVED_FROM_GROUP = 'user_removed_from_group',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
