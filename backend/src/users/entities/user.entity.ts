import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  USER = 'user',
  GROUP_ADMIN = 'group_admin',
  GLOBAL_ADMIN = 'global_admin',
}

export enum DataRegion {
  SWEDEN = 'sweden',
  EU = 'eu',
  USA = 'usa',
  CANADA = 'canada',
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 20, default: 'offline' })
  onlineStatus: string;

  // GDPR Compliance
  @Column({
    type: 'enum',
    enum: DataRegion,
    default: DataRegion.EU,
  })
  dataRegion: DataRegion;

  @Column({ type: 'boolean', default: false })
  gdprConsentGiven: boolean;

  @Column({ type: 'timestamp', nullable: true })
  gdprConsentDate?: Date;

  @Column({ type: 'boolean', default: false })
  marketingConsent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  dataRetentionUntil?: Date;

  @Column({ type: 'boolean', default: false })
  deletionRequested: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletionRequestedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual field - not stored in DB
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if password was modified
    if (this.password && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Method to sanitize user data before sending to client
  toJSON() {
    const { password, passwordResetToken, emailVerificationToken, ...user } = this;
    return user;
  }
}
