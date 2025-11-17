import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinCallDto {
  @ApiProperty({
    description: 'Enable audio on join',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isAudioEnabled?: boolean;

  @ApiProperty({
    description: 'Enable video on join',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVideoEnabled?: boolean;
}
