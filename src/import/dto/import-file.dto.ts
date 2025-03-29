import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ImportEntity {
  CUSTOMERS = 'customers',
  DEALS = 'deals',
  TASKS = 'tasks',
}

export class ImportFileDto {
  @ApiProperty({
    enum: ImportEntity,
    description: 'Entity type to import',
  })
  @IsNotEmpty()
  @IsEnum(ImportEntity)
  entity!: ImportEntity;
}
