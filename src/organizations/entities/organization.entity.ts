import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export type OrganizationDocument = Organization & Document;

// Define settings interface
export interface OrganizationSettings {
  theme: string;
  notifications: boolean;
  modules: {
    customers: boolean;
    deals: boolean;
    tasks: boolean;
    reports: boolean;
    [key: string]: boolean;
  };
}

@Schema({ timestamps: true })
export class Organization {
  // ID field is added by Mongoose but we need to declare it for TypeScript
  _id?: string;
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Prop({
    trim: true,
    unique: true,
  })
  @IsNotEmpty()
  domain: string;

  @Prop({
    trim: true,
  })
  @IsOptional()
  address?: string;

  @Prop({
    trim: true,
  })
  @IsOptional()
  phone?: string;

  @Prop({
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
  })
  @IsEnum(['free', 'basic', 'pro', 'enterprise'], {
    message: 'Plan must be either free, basic, pro, or enterprise',
  })
  plan: string;

  @Prop({
    default: true,
  })
  @IsBoolean()
  isActive: boolean;

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
  settings: OrganizationSettings;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
