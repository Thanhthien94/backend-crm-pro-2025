import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Organization {
  @Prop({
    required: [true, 'Please add organization name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
  })
  name!: string;

  @Prop({
    trim: true,
    unique: true,
  })
  domain!: string;

  @Prop({
    trim: true,
  })
  address?: string;

  @Prop({
    trim: true,
  })
  phone?: string;

  @Prop({
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
  })
  plan!: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive!: boolean;

  @Prop({
    type: Object,
    default: {
      theme: 'light',
      notifications: true,
      modules: {
        customers: true,
        deals: true,
        tasks: true,
        reports: false,
      },
    },
  })
  settings!: Record<string, any>;
}

export type OrganizationDocument = Organization & Document;
export const OrganizationSchema = SchemaFactory.createForClass(Organization);
