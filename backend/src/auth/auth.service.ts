import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditAction } from '../common/entities/audit-log.entity';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogService: AuditLogService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // Validate GDPR consent
    if (!registerDto.gdprConsentGiven) {
      throw new BadRequestException('GDPR consent is required to register');
    }

    // Create user
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      dataRegion: registerDto.dataRegion,
      gdprConsentGiven: registerDto.gdprConsentGiven,
      marketingConsent: registerDto.marketingConsent,
    });

    // Audit log
    await this.auditLogService.log({
      userId: user.id,
      action: AuditAction.GDPR_CONSENT_GIVEN,
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: {
        dataRegion: user.dataRegion,
        marketingConsent: user.marketingConsent,
      },
    });

    // Generate tokens
    return this.generateAuthResponse(user, ipAddress, userAgent);
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      await this.auditLogService.log({
        action: AuditAction.USER_LOGIN,
        entityType: 'User',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
        metadata: { email: loginDto.email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      await this.auditLogService.log({
        userId: user.id,
        action: AuditAction.USER_LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Account is inactive',
      });
      throw new UnauthorizedException('Account is inactive');
    }

    // Validate password
    const isValidPassword = await user.validatePassword(loginDto.password);

    if (!isValidPassword) {
      await this.auditLogService.log({
        userId: user.id,
        action: AuditAction.USER_LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    return this.generateAuthResponse(user, ipAddress, userAgent);
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // Find refresh token in database
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken || !storedToken.isValid()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Generate new tokens
    return this.generateAuthResponse(
      storedToken.user,
      ipAddress,
      userAgent,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);

      // Audit log
      await this.auditLogService.log({
        userId: storedToken.userId,
        action: AuditAction.USER_LOGOUT,
        entityType: 'User',
        entityId: storedToken.userId,
      });
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOne(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async generateAuthResponse(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenValue = this.generateRefreshToken();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() +
        parseInt(this.configService.get('jwt.refreshExpiresIn', '30')),
    );

    // Save refresh token to database
    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiry,
      ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);

    // Clean up old/expired refresh tokens for this user
    await this.cleanupExpiredTokens(user.id);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 3600, // 1 hour
      user: user.toJSON(),
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({
      userId,
      expiresAt: LessThan(new Date()),
    });

    // Also delete revoked tokens older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.refreshTokenRepository.delete({
      userId,
      isRevoked: true,
      createdAt: LessThan(thirtyDaysAgo),
    });
  }
}
