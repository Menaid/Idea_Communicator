import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for joining an existing call
 *
 * Used when a user joins a call via WebSocket
 */
export class JoinCallDto {
  @ApiProperty({
    description: 'Call ID to join',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  callId: string;
}
