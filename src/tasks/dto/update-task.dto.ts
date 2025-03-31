import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDate,
  IsOptional,
  ValidateIf,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';
import { RelatedEntityType } from '../../common/enums/related-entity-type.enum';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ example: '2023-09-30T15:00:00.000Z', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    required: false,
    description:
      'ID của đối tượng liên quan khác (khi relatedType được cung cấp)',
  })
  @IsOptional()
  @IsMongoId()
  @ValidateIf((o) => o.relatedType !== undefined || o.relatedTo !== undefined)
  relatedTo?: string;

  @ApiProperty({
    enum: RelatedEntityType,
    required: false,
    description: 'Loại đối tượng liên quan (khi relatedTo được cung cấp)',
  })
  @IsOptional()
  @IsEnum(RelatedEntityType)
  @ValidateIf((o) => o.relatedType !== undefined || o.relatedTo !== undefined)
  relatedType?: RelatedEntityType;
}
