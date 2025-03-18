import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomField extends Document {
  name: string;
  label: string;
  type: string;
  entity: string;
  required: boolean;
  default?: any;
  options?: string[];
  organization: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFieldSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Field name is required'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Field label is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'dropdown', 'checkbox', 'email', 'phone', 'url'],
      required: [true, 'Field type is required'],
    },
    entity: {
      type: String,
      enum: ['customer', 'deal', 'task'],
      required: [true, 'Entity type is required'],
    },
    required: {
      type: Boolean,
      default: false,
    },
    default: {
      type: Schema.Types.Mixed,
    },
    options: {
      type: [String],
      default: [],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique field names per entity per organization
CustomFieldSchema.index({ name: 1, entity: 1, organization: 1 }, { unique: true });

export default mongoose.model<ICustomField>('CustomField', CustomFieldSchema);
