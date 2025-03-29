import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

@Schema({ timestamps: true })
export class DynamicPolicy {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
  })
  key!: string;

  @Prop({
    type: String,
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;
}

export type DynamicPolicyDocument = DynamicPolicy & Document;
export const DynamicPolicySchema = SchemaFactory.createForClass(DynamicPolicy);

// Thêm indexes
DynamicPolicySchema.index({ key: 1, organization: 1 }, { unique: true });
