import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'acme.com', required: false })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({ example: '123 Business St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '555-123-4567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    enum: ['free', 'basic', 'pro', 'enterprise'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['free', 'basic', 'pro', 'enterprise'])
  plan?: string;
}
