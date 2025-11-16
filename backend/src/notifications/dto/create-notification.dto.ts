import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsUUID, IsObject } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
