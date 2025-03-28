import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  })
  name!: string;

  @Prop({
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  })
  email!: string;

  @Prop({
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  })
  password!: string;

  @Prop({
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  })
  role!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  })
  organization!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive!: boolean;

  // Add _id property for TypeScript support
  _id?: any;

  // JWT token generation method
  getSignedJwtToken(): string {
    const id =
      typeof this._id === 'string' ? this._id : this._id?.toString() || '';
    const payload = { id };
    const secret = process.env.JWT_SECRET || 'your-default-secret';
    const options: jwt.SignOptions = {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    };

    return jwt.sign(payload, secret, options);
  }

  // Password comparison method
  async matchPassword(enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook to hash password
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
