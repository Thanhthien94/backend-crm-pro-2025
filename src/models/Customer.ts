import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  type: string;
  status: string;
  source?: string;
  assignedTo: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  notes?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add customer name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['lead', 'prospect', 'customer', 'churned'],
      default: 'lead',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    source: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    notes: {
      type: String,
    },
    customFields: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster querying within organization scope
CustomerSchema.index({ organization: 1, email: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
