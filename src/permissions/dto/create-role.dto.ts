import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'sales_manager' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Slug can only contain lowercase letters, numbers, and underscores',
  })
  slug!: string;

  @ApiProperty({ example: ['601a2dc1a77e4e001f3ac12c'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiProperty({ example: 'Role for managing sales team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
