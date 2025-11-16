import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { DataRegion } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    enum: DataRegion,
    example: DataRegion.EU,
    description: 'Data storage region preference',
    default: DataRegion.EU,
  })
  @IsEnum(DataRegion)
  @IsOptional()
  dataRegion?: DataRegion = DataRegion.EU;

  @ApiProperty({
    example: true,
    description: 'GDPR consent (required)',
  })
  @IsBoolean()
  gdprConsentGiven: boolean;

  @ApiProperty({
    example: false,
    description: 'Marketing consent (optional)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean = false;
}
