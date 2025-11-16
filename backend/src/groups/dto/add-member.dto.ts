import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: 'user-id-here' })
  @IsUUID('4')
  userId: string;

  @ApiPropertyOptional({ example: 'member', enum: ['admin', 'member'] })
  @IsOptional()
  @IsEnum(['admin', 'member'])
  role?: string;
}
