import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDynamicPolicyDto {
  @ApiProperty({ example: 'Customer Owner Policy' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'customer:update' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]+:[a-z0-9_]+$/, {
    message: 'Key must be in format "resource:action"',
  })
  key!: string;

  @ApiProperty({ example: 'Policy to allow only customer owners to update' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
