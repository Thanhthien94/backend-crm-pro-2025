import { PartialType } from '@nestjs/swagger';
import { CreateWebhookDto } from './create-webhook.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiProperty({
    enum: ['active', 'inactive', 'failed'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'failed'])
  status?: string;
}
