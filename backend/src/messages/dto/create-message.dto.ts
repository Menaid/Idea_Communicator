import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'group-id-here' })
  @IsUUID('4')
  groupId: string;

  @ApiProperty({ example: 'Hello, everyone!' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'text', enum: ['text', 'image', 'file', 'system'] })
  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'system'])
  type?: string;

  @ApiPropertyOptional({ example: { fileUrl: 'https://example.com/file.pdf', fileName: 'document.pdf' } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
