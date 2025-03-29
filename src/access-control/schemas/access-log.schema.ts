// src/access-control/schemas/access-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: false })
export class AccessLog {
  @Prop({
    type: String,
    required: true,
  })
  userId!: string;

  @Prop({
    type: String,
    required: true,
  })
  resource!: string;

  @Prop({
    type: String,
    required: true,
  })
  action!: string;

  @Prop({
    type: String,
  })
  resourceId?: string;

  @Prop({
    type: Boolean,
    required: true,
  })
  allowed!: boolean;

  @Prop({
    type: Date,
    required: true,
  })
  timestamp!: Date;

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
}

export type AccessLogDocument = AccessLog & Document;
export const AccessLogSchema = SchemaFactory.createForClass(AccessLog);

// Thêm indexes cho tìm kiếm hiệu quả
AccessLogSchema.index({ userId: 1, timestamp: -1 });
AccessLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
AccessLogSchema.index({ timestamp: -1 });
