import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class ApiKey {
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
    unique: true,
  })
  key!: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: Date,
  })
  expiresAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: User;

  @Prop({
    type: Date,
  })
  lastUsedAt?: Date;

  @Prop({
    type: [String],
    default: ['read'],
  })
  permissions!: string[];

  @Prop({
    type: String,
    default: 'API key from Node.js app',
  })
  description?: string;
}

export type ApiKeyDocument = ApiKey & Document;
export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Add indexes
ApiKeySchema.index({ organization: 1 });
ApiKeySchema.index({ key: 1 }, { unique: true });
