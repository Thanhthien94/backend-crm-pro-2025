import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as crypto from 'crypto';

@Schema({ timestamps: true })
export class Webhook {
  @Prop({
    required: [true, 'Webhook name is required'],
    trim: true,
  })
  name!: string;

  @Prop({
    required: [true, 'Webhook URL is required'],
    trim: true,
  })
  url!: string;

  @Prop({
    type: [String],
    required: [true, 'At least one event is required'],
    validate: {
      validator: function (events: string[]) {
        return events.length > 0;
      },
      message: 'Please specify at least one event',
    },
  })
  events!: string[];

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'failed'],
    default: 'active',
  })
  status!: string;

  @Prop({
    default: () => crypto.randomBytes(32).toString('hex'),
  })
  secretKey!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Object,
    default: {},
  })
  headers?: Record<string, string>;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: MongooseSchema.Types.ObjectId;

  @Prop()
  lastTriggered?: Date;

  @Prop({
    type: Number,
    default: 0,
  })
  failureCount!: number;

  // Method to generate HMAC signature for webhook payload
  generateSignature(payload: any): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    const signature = hmac.update(JSON.stringify(payload)).digest('hex');
    return signature;
  }
}

export type WebhookDocument = Webhook & Document;
export const WebhookSchema = SchemaFactory.createForClass(Webhook);
