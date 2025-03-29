import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';

@Schema({ timestamps: true })
export class Product {
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
  price!: number;

  @Prop({
    type: String,
    trim: true,
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
  })
  sku?: string;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  stock?: number;

  @Prop({
    type: Object,
    default: {},
  })
  customFields?: Record<string, any>;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status!: string;
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);
// add indexes for better performance
ProductSchema.index({ organization: 1, name: 1 });
ProductSchema.index({ organization: 1, sku: 1 });
