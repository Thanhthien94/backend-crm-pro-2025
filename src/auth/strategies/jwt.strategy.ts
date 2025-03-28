import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { OrganizationsService } from '../../organizations/organizations.service';
interface JwtPayload {
  id: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
  ) {
    const jwtSecret = configService.get<string>('jwt.secret');
    if (!jwtSecret) {
      throw new Error('JWT secret is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      // Get user from payload id
      const user = await this.usersService.findById(payload.id);

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Check if organization is active
      const organization = await this.organizationsService.findById(
        payload.organizationId || String(user.organization),
      );

      if (!organization.isActive) {
        throw new UnauthorizedException('Organization account is suspended');
      }

      return {
        ...user,
        organizationId: String(user.organization),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
