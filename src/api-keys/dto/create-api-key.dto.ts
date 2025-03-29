// src/api-keys/schemas/api-key.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Organization } from '../../organizations/schemas/organization.schema';
import { User } from '../../users/schemas/user.schema';
import * as crypto from 'crypto';

@Schema({ timestamps: true })
export class ApiKey {
  // Add _id property for TypeScript support
  _id?: any;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  key!: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: Date,
  })
  expiresAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Organization;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: User;

  @Prop({
    type: Date,
  })
  lastUsedAt?: Date;

  @Prop({
    type: [String],
    default: ['read'],
  })
  permissions!: string[];

  @Prop({
    type: String,
    default: 'API key from Node.js app',
  })
  description?: string;
}

export type ApiKeyDocument = ApiKey & Document;
export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Add indexes
ApiKeySchema.index({ organization: 1 });
ApiKeySchema.index({ key: 1 }, { unique: true });

// src/api-keys/dto/create-api-key.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ApiPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Used for production environment', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2025-12-31', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    enum: ApiPermission,
    isArray: true,
    example: [ApiPermission.READ, ApiPermission.WRITE],
    default: [ApiPermission.READ],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiPermission, { each: true })
  permissions?: ApiPermission[] = [ApiPermission.READ];
}
