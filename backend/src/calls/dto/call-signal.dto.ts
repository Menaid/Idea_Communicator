import { IsUUID, IsString, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Signal types for WebRTC negotiation
 */
export enum SignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
}

/**
 * DTO for WebRTC signaling messages
 *
 * Used for exchanging WebRTC connection metadata between peers
 */
export class CallSignalDto {
  @ApiProperty({
    description: 'Call ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  callId: string;

  @ApiProperty({
    description: 'Signal type',
    enum: SignalType,
    example: SignalType.OFFER,
  })
  @IsEnum(SignalType)
  type: SignalType;

  @ApiProperty({
    description: 'Signal payload (SDP or ICE candidate)',
    example: { sdp: '...', type: 'offer' },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'Target user ID (for directed signals)',
    required: false,
  })
  @IsUUID()
  @IsString()
  targetUserId?: string;
}
