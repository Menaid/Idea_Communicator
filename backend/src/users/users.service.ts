import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditAction } from '../common/entities/audit-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      where: { isActive: true, deletionRequested: false },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatarUrl',
        'role',
        'createdAt',
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, deletionRequested: false },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Validate email is provided
    if (!userData.email) {
      throw new BadRequestException('Email is required');
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Normalize email
    userData.email = userData.email.toLowerCase();

    // Set GDPR consent date if consent given
    if (userData.gdprConsentGiven) {
      userData.gdprConsentDate = new Date();
    }

    // Calculate data retention period (default 6 months)
    const retentionMonths = 6;
    const retentionDate = new Date();
    retentionDate.setMonth(retentionDate.getMonth() + retentionMonths);
    userData.dataRetentionUntil = retentionDate;

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    // Audit log
    await this.auditLogService.log({
      userId: savedUser.id,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: savedUser.id,
      metadata: {
        email: savedUser.email,
        dataRegion: savedUser.dataRegion,
      },
    });

    return savedUser;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestUserId?: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    // Audit log
    await this.auditLogService.log({
      userId: requestUserId || id,
      action: AuditAction.USER_UPDATED,
      entityType: 'User',
      entityId: id,
      metadata: updateUserDto,
    });

    return updatedUser;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isValidPassword = await user.validatePassword(
      changePasswordDto.currentPassword,
    );

    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password
    user.password = changePasswordDto.newPassword;
    await this.usersRepository.save(user);

    // Audit log
    await this.auditLogService.log({
      userId: id,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: 'User',
      entityId: id,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });

    // Audit log
    await this.auditLogService.log({
      userId: id,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: id,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    // Soft delete - mark for deletion instead of actually deleting
    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    user.isActive = false;

    await this.usersRepository.save(user);

    // Audit log
    await this.auditLogService.log({
      userId: id,
      action: AuditAction.DELETION_REQUESTED,
      entityType: 'User',
      entityId: id,
    });
  }

  // GDPR: Export user data
  async exportUserData(id: string): Promise<any> {
    const user = await this.findOne(id);
    const auditLogs = await this.auditLogService.exportUserAuditTrail(id);

    // Audit log
    await this.auditLogService.log({
      userId: id,
      action: AuditAction.DATA_EXPORT_REQUESTED,
      entityType: 'User',
      entityId: id,
    });

    return {
      user: user.toJSON(),
      auditTrail: auditLogs,
      exportDate: new Date().toISOString(),
    };
  }

  // GDPR: Hard delete user and all associated data
  async hardDelete(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Log before deletion
    await this.auditLogService.log({
      userId: id,
      action: AuditAction.DELETION_COMPLETED,
      entityType: 'User',
      entityId: id,
    });

    // Delete user (cascade will handle related entities)
    await this.usersRepository.remove(user);

    // Delete audit logs after user deletion
    await this.auditLogService.deleteUserAuditLogs(id);
  }
}
