import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Enterprise Software License' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 1500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'Comprehensive software solution for enterprise needs', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'ESL-2023-001', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({
    example: { category: 'Software', taxable: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiProperty({
    enum: ['active', 'inactive'],
    default: 'active',
    required: false,
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string = 'active';
}
