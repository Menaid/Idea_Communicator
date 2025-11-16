import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/user.entity';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    let user: User | null = null;

    // Check if it's an email or username
    if (usernameOrEmail.includes('@')) {
      user = await this.usersService.findByEmail(usernameOrEmail);
    } else {
      user = await this.usersService.findByUsername(usernameOrEmail);
    }

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: plainToInstance(UserResponseDto, user),
    };
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user);

    // Update online status
    await this.usersService.updateOnlineStatus(user.id, 'online');

    return {
      ...tokens,
      user: plainToInstance(UserResponseDto, user),
    };
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findOne(userId);
    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.updateOnlineStatus(userId, 'offline');
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
