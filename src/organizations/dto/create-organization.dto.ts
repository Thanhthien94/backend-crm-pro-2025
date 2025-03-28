import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'acme.com' })
  @IsOptional()
  @IsString()
  domain?: string;
}
