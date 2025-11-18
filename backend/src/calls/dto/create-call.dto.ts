import { IsUUID, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CallType } from '../entities/call.entity';

/**
 * DTO for creating a new call
 *
 * Used when initiating a call in a group
 */
export class CreateCallDto {
  @ApiProperty({
    description: 'Group ID where the call will take place',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  groupId: string;

  @ApiProperty({
    description: 'Type of call',
    enum: CallType,
    example: CallType.VIDEO,
    default: CallType.VIDEO,
  })
  @IsEnum(CallType)
  @IsOptional()
  type?: CallType;

  @ApiProperty({
    description: 'Optional metadata for the call',
    required: false,
    example: { quality: 'high', recordingEnabled: false },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
