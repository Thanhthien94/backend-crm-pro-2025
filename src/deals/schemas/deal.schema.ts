import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Customer } from '../../customers/schemas/customer.schema';

@Schema({ timestamps: true })
export class Deal {
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
    type: Number,
    min: 0,
  })
  value!: number;

  @Prop({
    required: true,
    type: String,
    enum: [
      'lead',
      'qualified',
      'proposal',
      'negotiation',
      'closed-won',
      'closed-lost',
    ],
    default: 'lead',
  })
  stage!: string;

  @Prop({
    type: Date,
  })
  expectedCloseDate?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  })
  customer!: Customer;

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

  @Prop({
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  })
  probability?: number;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status!: string;
}

export type DealDocument = Deal & Document;
export const DealSchema = SchemaFactory.createForClass(Deal);
// add indexes for better performance
DealSchema.index({ organization: 1, stage: 1 });
DealSchema.index({ organization: 1, customer: 1 });
