import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  domain: string;
  address?: string;
  phone?: string;
  plan: string;
  isActive: boolean;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add organization name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    domain: {
      type: String,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
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
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
