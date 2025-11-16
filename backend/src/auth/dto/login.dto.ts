import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or johndoe' })
  @IsString()
  usernameOrEmail: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;
}
