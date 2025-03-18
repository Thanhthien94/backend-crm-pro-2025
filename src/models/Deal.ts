import mongoose, { Document, Schema } from 'mongoose';

export interface IDeal extends Document {
  title: string;
  customer: mongoose.Types.ObjectId;
  value: number;
  currency: string;
  stage: string;
  status: string;
  probability: number;
  expectedCloseDate?: Date;
  assignedTo: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  products?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  notes?: string;
  activities?: Array<{
    type: string;
    description: string;
    date: Date;
    user: mongoose.Types.ObjectId;
  }>;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add deal title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    stage: {
      type: String,
      enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
      default: 'lead',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    expectedCloseDate: {
      type: Date,
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
    products: [
      {
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    notes: {
      type: String,
    },
    activities: [
      {
        type: {
          type: String,
          enum: ['note', 'call', 'meeting', 'email', 'task'],
        },
        description: String,
        date: {
          type: Date,
          default: Date.now,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    customFields: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
DealSchema.index({ organization: 1, stage: 1 });
DealSchema.index({ organization: 1, customer: 1 });
DealSchema.index({ organization: 1, assignedTo: 1 });

export default mongoose.model<IDeal>('Deal', DealSchema);
