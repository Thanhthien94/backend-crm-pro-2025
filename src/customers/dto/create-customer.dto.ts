import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'contact@acme.com' })
  @IsEmail({}, { message: 'Please add a valid email' })
  email!: string;

  @ApiProperty({ example: '+1-555-123-4567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Acme Corporation', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({
    enum: ['lead', 'prospect', 'customer', 'churned'],
    default: 'lead',
  })
  @IsOptional()
  @IsEnum(['lead', 'prospect', 'customer', 'churned'])
  type?: string = 'lead';

  @ApiProperty({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string = 'active';

  @ApiProperty({ example: 'website', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ example: 'Key enterprise client', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: { industry: 'Technology', size: 'Enterprise' },
    required: false,
  })
  @IsOptional()
  customFields?: Record<string, any>;
}
