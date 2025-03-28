import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsUrl,
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEvent } from '../enums/webhook-event.enum';

export class CreateWebhookDto {
  @ApiProperty({ example: 'New Customer Notification' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'https://example.com/webhooks/crm' })
  @IsNotEmpty()
  @IsUrl()
  url!: string;

  @ApiProperty({
    type: [String],
    enum: WebhookEvent,
    example: [WebhookEvent.CUSTOMER_CREATED, WebhookEvent.CUSTOMER_UPDATED],
  })
  @IsNotEmpty()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events!: WebhookEvent[];

  @ApiProperty({
    required: false,
    example: { 'X-Custom-Header': 'Custom-Value' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
