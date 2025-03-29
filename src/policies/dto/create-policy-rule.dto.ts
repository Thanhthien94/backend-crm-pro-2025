import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RuleType } from '../schemas/policy-rule.schema';

export class CreatePolicyRuleDto {
  @ApiProperty({ example: 'Ownership Check' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    enum: RuleType,
    example: RuleType.OWNERSHIP,
  })
  @IsNotEmpty()
  @IsEnum(RuleType)
  type!: RuleType;

  @ApiProperty({
    example: {},
    description: 'Cấu hình cho rule, khác nhau tùy theo loại rule',
  })
  @IsObject()
  config!: Record<string, any>;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number = 1;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
