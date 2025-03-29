import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateIf,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FieldType, EntityType } from '../schemas/custom-field.schema';

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'Industry' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'industry' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Key can only contain lowercase letters, numbers, and underscores',
  })
  key!: string;

  @ApiProperty({
    enum: FieldType,
    example: FieldType.SELECT,
  })
  @IsNotEmpty()
  @IsEnum(FieldType)
  type!: FieldType;

  @ApiProperty({
    enum: EntityType,
    example: EntityType.CUSTOMER,
  })
  @IsNotEmpty()
  @IsEnum(EntityType)
  entity!: EntityType;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean = false;

  @ApiProperty({ example: 'Customer industry classification', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  defaultValue?: any;

  @ApiProperty({
    example: ['Technology', 'Finance', 'Healthcare', 'Education'],
    required: false,
  })
  @ValidateIf((o) => o.type === FieldType.SELECT)
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  displayOrder?: number = 0;
}
