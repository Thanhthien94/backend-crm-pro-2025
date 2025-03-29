import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DynamicPolicy } from './dynamic-policy.schema';

export enum RuleType {
  OWNERSHIP = 'ownership',
  SAME_ORGANIZATION = 'same_organization',
  ROLE_BASED = 'role_based',
  CUSTOM_JS = 'custom_js',
  FIELD_VALUE = 'field_value',
}

@Schema({ timestamps: true })
export class PolicyRule {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'DynamicPolicy',
    required: true,
  })
  policy!: DynamicPolicy;

  @Prop({
    required: true,
    enum: Object.values(RuleType),
  })
  type!: RuleType;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  config!: Record<string, any>;

  @Prop({
    type: Number,
    default: 1,
  })
  order!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;
}

export type PolicyRuleDocument = PolicyRule & Document;
export const PolicyRuleSchema = SchemaFactory.createForClass(PolicyRule);

// Thêm indexes
PolicyRuleSchema.index({ policy: 1, order: 1 });
