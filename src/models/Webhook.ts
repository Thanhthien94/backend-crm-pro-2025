import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IWebhook extends Document {
  name: string;
  url: string;
  events: string[];
  status: string;
  secretKey: string;
  organization: mongoose.Types.ObjectId;
  headers?: Record<string, string>;
  createdBy: mongoose.Types.ObjectId;
  lastTriggered?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  generateSignature(payload: any): string;
}

const WebhookSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      trim: true,
    },
    events: {
      type: [String],
      required: [true, 'At least one event is required'],
      validate: {
        validator: function (events: string[]) {
          return events.length > 0;
        },
        message: 'Please specify at least one event',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'failed'],
      default: 'active',
    },
    secretKey: {
      type: String,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    headers: {
      type: Object,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastTriggered: {
      type: Date,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to generate HMAC signature for webhook payload
WebhookSchema.methods.generateSignature = function (payload: any) {
  const hmac = crypto.createHmac('sha256', this.secretKey);
  const signature = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature;
};

export default mongoose.model<IWebhook>('Webhook', WebhookSchema);
