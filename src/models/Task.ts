import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  dueDate?: Date;
  priority: string;
  status: string;
  assignedTo: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  relatedTo?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  reminderDate?: Date;
  completedDate?: Date;
  completedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add task title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'canceled'],
      default: 'pending',
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
    relatedTo: {
      model: {
        type: String,
        enum: ['Customer', 'Deal'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    reminderDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes for common queries
TaskSchema.index({ organization: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ organization: 1, dueDate: 1 });
TaskSchema.index({
  organization: 1,
  'relatedTo.model': 1,
  'relatedTo.id': 1,
});

export default mongoose.model<ITask>('Task', TaskSchema);
