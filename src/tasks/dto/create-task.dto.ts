import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Follow up with client' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    example: 'Call to discuss the proposal details',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ['todo', 'in_progress', 'completed', 'canceled'],
    default: 'todo',
  })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'completed', 'canceled'])
  status?: string = 'todo';

  @ApiProperty({
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string = 'medium';

  @ApiProperty({ example: '2023-09-30T15:00:00.000Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dueDate!: Date;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false })
  @IsOptional()
  @IsMongoId()
  customer?: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false })
  @IsOptional()
  @IsMongoId()
  deal?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean = false;

  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly', 'none'],
    required: false,
    default: 'none',
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'none'])
  recurringFrequency?: string = 'none';
}
