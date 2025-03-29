import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export enum ResourceType {
  CUSTOMER = 'customer',
  DEAL = 'deal',
  TASK = 'task',
  USER = 'user',
  PRODUCT = 'product',
  ORGANIZATION = 'organization',
  WEBHOOK = 'webhook',
  API_KEY = 'api_key',
  CUSTOM_FIELD = 'custom_field',
  ANALYTICS = 'analytics',
}

export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Bao gồm tất cả quyền
}

@Schema({ timestamps: true })
export class Permission {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    enum: Object.values(ResourceType),
  })
  resource!: ResourceType;

  @Prop({
    required: true,
    enum: Object.values(ActionType),
  })
  action!: ActionType;

  @Prop({
    type: String,
    required: true,
    unique: true,
    // Ví dụ: customer:create, deal:read
    default: function (this: Permission) {
      return `${this.resource}:${this.action}`;
    },
  })
  slug!: string;

  @Prop({
    type: String,
  })
  description?: string;
}

export type PermissionDocument = Permission & Document;
export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Thêm index
PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });
PermissionSchema.index({ slug: 1 }, { unique: true });

// Thêm methods
PermissionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};
