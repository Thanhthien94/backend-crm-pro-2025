import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Permission } from './permission.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

@Schema({ timestamps: true })
export class Role {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
  })
  slug!: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'Permission',
  })
  permissions!: Permission[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDefault!: boolean;

  @Prop({
    type: String,
  })
  description?: string;
}

export type RoleDocument = Role & Document;
export const RoleSchema = SchemaFactory.createForClass(Role);

// Thêm index
RoleSchema.index({ slug: 1, organization: 1 }, { unique: true });
