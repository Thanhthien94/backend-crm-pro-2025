import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Task } from './task.schema';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';

export enum ActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
  ASSIGNED = 'assigned',
  COMMENT_ADDED = 'comment_added',
  DELETED = 'deleted',
  DUE_DATE_CHANGED = 'due_date_changed',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class TaskActivity {
  // Add _id property for TypeScript support
  _id?: any;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    required: true,
  })
  task!: Task;

  @Prop({
    required: true,
    enum: Object.values(ActivityType),
  })
  activityType!: ActivityType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  performedBy!: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: Object,
    default: {},
  })
  details?: Record<string, any>;

  @Prop({
    type: String,
  })
  comment?: string;
}

export type TaskActivityDocument = TaskActivity & Document;
export const TaskActivitySchema = SchemaFactory.createForClass(TaskActivity);

// Add indexes for better performance
TaskActivitySchema.index({ task: 1, createdAt: -1 });
TaskActivitySchema.index({ organization: 1, createdAt: -1 });
TaskActivitySchema.index({ performedBy: 1, createdAt: -1 });
