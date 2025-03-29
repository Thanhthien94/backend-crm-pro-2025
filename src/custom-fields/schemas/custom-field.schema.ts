import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  TEXTAREA = 'textarea',
}

export enum EntityType {
  CUSTOMER = 'customer',
  DEAL = 'deal',
  TASK = 'task',
}

@Schema({ timestamps: true })
export class CustomField {
  // Add _id property for TypeScript support
  _id?: any;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
    lowercase: true,
  })
  key!: string;

  @Prop({
    required: true,
    enum: Object.values(FieldType),
  })
  type!: FieldType;

  @Prop({
    required: true,
    enum: Object.values(EntityType),
  })
  entity!: EntityType;

  @Prop({
    type: Boolean,
    default: false,
  })
  required!: boolean;

  @Prop()
  description?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  defaultValue?: any;

  @Prop({
    type: [String],
  })
  options?: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  displayOrder!: number;
}

export type CustomFieldDocument = CustomField & Document;
export const CustomFieldSchema = SchemaFactory.createForClass(CustomField);

// Add indexes
CustomFieldSchema.index({ entity: 1, organization: 1 });
CustomFieldSchema.index({ key: 1, organization: 1 }, { unique: true });
