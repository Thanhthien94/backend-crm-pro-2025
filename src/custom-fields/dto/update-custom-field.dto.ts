import { PartialType } from '@nestjs/swagger';
import { CreateCustomFieldDto } from './create-custom-field.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomFieldDto extends PartialType(CreateCustomFieldDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
