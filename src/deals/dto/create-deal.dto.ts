import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDealDto {
  @ApiProperty({ example: 'Enterprise Software License' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 15000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({
    enum: [
      'lead',
      'qualified',
      'proposal',
      'negotiation',
      'closed-won',
      'closed-lost',
    ],
    default: 'lead',
  })
  @IsOptional()
  @IsEnum([
    'lead',
    'qualified',
    'proposal',
    'negotiation',
    'closed-won',
    'closed-lost',
  ])
  stage?: string = 'lead';

  @ApiProperty({ example: '2023-12-31', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedCloseDate?: Date;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  @IsNotEmpty()
  @IsString()
  customer!: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({
    example: 'Client is interested in premium features',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: { source: 'Website', campaign: 'Summer2023' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiProperty({ example: 75, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  // status?: string = 'active';
  @ApiProperty({
    enum: ['active', 'inactive'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string = 'active';
}
