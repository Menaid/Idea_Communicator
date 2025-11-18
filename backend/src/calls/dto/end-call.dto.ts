import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reason for ending a call
 */
export enum EndCallReason {
  NORMAL = 'normal',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

/**
 * DTO for ending a call
 *
 * Used when the call initiator or last participant ends the call
 */
export class EndCallDto {
  @ApiProperty({
    description: 'Call ID to end',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  callId: string;

  @ApiProperty({
    description: 'Reason for ending the call',
    enum: EndCallReason,
    default: EndCallReason.NORMAL,
    required: false,
  })
  @IsEnum(EndCallReason)
  @IsOptional()
  reason?: EndCallReason;
}
