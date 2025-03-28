import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    createUserDto: CreateUserDto & { organization: string },
  ): Promise<User> {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findAll(organizationId: string): Promise<User[]> {
    return this.userModel.find({ organization: organizationId }).exec();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string, includePassword = false): Promise<User> {
    let query = this.userModel.findOne({ email });

    if (includePassword) {
      query = query.select('+password') as typeof query;
    }

    const user = await query.exec();

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  /**
   * Find a user by email without throwing an exception if not found
   * Useful for checking existence before creating a new user
   */
  async findByEmailSafe(
    email: string,
    includePassword = false,
  ): Promise<User | null> {
    let query = this.userModel.findOne({ email });

    if (includePassword) {
      query = query.select('+password') as typeof query;
    }

    return query.exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async comparePasswords(
    providedPassword: string,
    storedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(providedPassword, storedPassword);
  }

  /**
   * Generate a password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.findByEmail(email);

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiration (10 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.userModel.updateOne(
      { _id: user._id },
      {
        passwordResetToken: hashedToken,
        passwordResetExpires: user.passwordResetExpires,
      },
    );

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with token and check if token is still valid
    const user = await this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return false;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return true;
  }
}
