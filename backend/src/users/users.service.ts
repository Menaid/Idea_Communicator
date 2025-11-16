import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findAll(search?: string, limit: number = 50): Promise<User[]> {
    const query: any = { isActive: true };

    if (search) {
      return this.usersRepository.find({
        where: [
          { username: Like(`%${search}%`), isActive: true },
          { displayName: Like(`%${search}%`), isActive: true },
          { email: Like(`%${search}%`), isActive: true },
        ],
        take: limit,
        select: ['id', 'username', 'displayName', 'email', 'avatarUrl', 'onlineStatus', 'createdAt'],
      });
    }

    return this.usersRepository.find({
      where: query,
      take: limit,
      select: ['id', 'username', 'displayName', 'email', 'avatarUrl', 'onlineStatus', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  async updateOnlineStatus(id: string, status: string): Promise<User> {
    const user = await this.findOne(id);
    user.onlineStatus = status;
    user.lastSeenAt = new Date();
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
