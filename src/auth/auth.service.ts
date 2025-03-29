import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

import { Organization } from '../organizations/entities/organization.entity';

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organization: {
      id: string;
      name: string;
      plan?: string;
    };
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    organization: {
      id: string;
      name: string;
      plan?: string;
    } | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    passwordValidate: string,
  ): Promise<User | null> {
    try {
      const user = await this.usersService.findByEmail(email, true);
      const isMatch = await this.usersService.comparePasswords(
        passwordValidate,
        user.password,
      );

      if (!isMatch) {
        return null;
      }

      // Return complete user object but remove password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result as User;
    } catch {
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('User found:', user);
    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is suspended');
    }
    // check origination
    if (!user.organization) {
      throw new UnauthorizedException(
        'User does not belong to any organization',
      );
    }

    // Get organization info
    const organization = await this.organizationsService.findById(
      String(user.organization),
    );

    // Check if organization is active
    if (!organization.isActive) {
      throw new UnauthorizedException('Organization account is suspended');
    }

    return this.generateAuthResponse(user, organization);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmailSafe(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Create organization
    const organization = await this.organizationsService.create({
      name: registerDto.organizationName,
      domain: registerDto.email.split('@')[1],
    });

    // Create user
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: 'admin', // First user is admin
      organization: String(organization._id), // Ensure safe conversion to string
    });

    return this.generateAuthResponse(user, organization);
  }
  private generateAuthResponse(
    user: User,
    organization: Organization,
  ): AuthResponse {
    const payload = {
      id: String(user._id),
      organizationId: String(user.organization),
      role: user.role,
    };

    return {
      success: true,
      token: this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: String(organization._id),
          name: organization.name,
          plan: organization.plan,
        },
      },
    };
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.usersService.findById(userId);
    const organization = await this.organizationsService.findById(
      String(user.organization),
    );

    return {
      success: true,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        organization: organization
          ? {
              id: String(organization._id),
              name: organization.name,
              plan: organization.plan,
            }
          : null,
      },
    };
  }

  /**
   * Request password reset
   * @param email User email
   * @returns Object with success status
   */
  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Generate reset token
      const resetToken =
        await this.usersService.generatePasswordResetToken(email);

      // Note: In a real application, you would send an email with the reset token
      // For the sake of this demo, we'll just return the token
      console.log(`Reset token for ${email}: ${resetToken}`);

      return {
        success: true,
        message: 'Password reset token generated. Check your email.',
      };
    } catch {
      // Don't reveal if the email exists or not for security
      return {
        success: true,
        message: 'If this email exists, a password reset link has been sent.',
      };
    }
  }

  /**
   * Reset password with token
   * @param token Reset token
   * @param password New password
   * @returns Object with success status
   */
  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.usersService.resetPassword(token, password);

    if (!success) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }
}
