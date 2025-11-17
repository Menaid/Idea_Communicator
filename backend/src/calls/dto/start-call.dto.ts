import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CallType } from '../entities/call.entity';

export class StartCallDto {
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
  })
  @IsEnum(CallType)
  type: CallType;
}
