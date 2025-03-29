import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from 'src/permissions/schemas/role.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // ID field is added by Mongoose but we need to declare it for TypeScript
  _id?: Types.ObjectId;
  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @Prop({
    required: true,
    unique: true,
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please add a valid email' })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Exclude()
  password!: string;

  @Prop({
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  })
  @IsEnum(['user', 'admin', 'superadmin'], {
    message: 'Role must be either user, admin, or superadmin',
  })
  role!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: Types.ObjectId;

  @Prop({
    default: true,
  })
  @IsBoolean()
  isActive!: boolean;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({
    type: [Types.ObjectId],
    ref: 'Role',
  })
  roles!: Role[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure password is excluded from JSON response
UserSchema.methods.toJSON = function (this: UserDocument) {
  const obj: Partial<User> = this.toObject() as Partial<User>;
  delete obj.password;
  return obj;
};
