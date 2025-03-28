import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

@Schema({ timestamps: true })
export class Customer {
  // Add _id property for TypeScript support
  _id?: any;
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    required: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  })
  email!: string;

  @Prop({
    trim: true,
  })
  phone?: string;

  @Prop({
    trim: true,
  })
  company?: string;

  @Prop({
    type: String,
    enum: ['lead', 'prospect', 'customer', 'churned'],
    default: 'lead',
  })
  type!: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status!: string;

  @Prop({
    trim: true,
  })
  source?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  assignedTo!: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop()
  notes?: string;

  @Prop({
    type: Object,
    default: {},
  })
  customFields?: Record<string, any>;
}

export type CustomerDocument = Customer & Document;
export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Add indexes
CustomerSchema.index({ organization: 1, email: 1 });
