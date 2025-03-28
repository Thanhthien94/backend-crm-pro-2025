import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ example: 'light', required: false })
  @IsOptional()
  theme?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @ApiProperty({
    example: {
      customers: true,
      deals: true,
      tasks: true,
      reports: true,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  modules?: {
    customers?: boolean;
    deals?: boolean;
    tasks?: boolean;
    reports?: boolean;
  };
}
