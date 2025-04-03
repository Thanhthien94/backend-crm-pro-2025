import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Organization } from '../../organizations/schemas/organization.schema';
import { Customer } from '../../customers/schemas/customer.schema';
import { Deal } from '../../deals/schemas/deal.schema';
import { RelatedEntityType } from '../../common/enums/related-entity-type.enum';

@Schema({ timestamps: true })
export class Task {
  // Add _id property for TypeScript support
  _id?: any;

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
    default: 'todo',
  })
  status!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority!: string;

  @Prop({
    type: Date,
    required: true,
  })
  dueDate!: Date;

  @Prop({
    type: Date,
    required: true,
  })
  reminderDate!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  assignedTo!: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  completedBy!: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  // Giữ các trường liên kết cụ thể cho các đối tượng chính
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Customer',
  })
  customer?: Customer;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Deal',
  })
  deal?: Deal;

  // Thêm trường đa hình cho các đối tượng phụ hoặc tương lai
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'relatedType',
  })
  relatedTo?: any;

  @Prop({
    type: String,
    enum: Object.values(RelatedEntityType),
  })
  relatedType?: RelatedEntityType;

  @Prop({
    type: Date,
  })
  completedAt?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  isRecurring!: boolean;

  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'none'],
    default: 'none',
  })
  recurringFrequency?: string;
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);

// Add indexes
TaskSchema.index({ organization: 1, status: 1 });
TaskSchema.index({ organization: 1, assignedTo: 1 });
TaskSchema.index({ organization: 1, dueDate: 1 });
// Thêm index cho các trường liên kết mới
TaskSchema.index({ relatedTo: 1, relatedType: 1 });
