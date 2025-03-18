import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IApiKey extends Document {
  name: string;
  key: string;
  organization: mongoose.Types.ObjectId;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      default: () => `crm_${crypto.randomBytes(32).toString('hex')}`,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    permissions: {
      type: [String],
      required: true,
      default: ['read'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
    lastUsed: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ApiKeySchema.index({ key: 1 });
ApiKeySchema.index({ organization: 1 });

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
