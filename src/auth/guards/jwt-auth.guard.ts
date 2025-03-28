import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First try the default Passport JWT strategy
    try {
      const canActivate = await super.canActivate(context);
      if (canActivate) {
        return true;
      }
    } catch {
      // Continue to try cookie
    }

    // If JWT from Authorization header fails, try from cookie
    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('Not authorized to access this route');
    }

    try {
      const payload = this.jwtService.verify<{ id: string }>(token, {
        secret: this.configService.get('jwt.secret'),
      });

      // Get user from database
      const user = await this.usersService.findById(payload.id);

      // Attach user to request
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Not authorized to access this route');
    }
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return (request.cookies as Record<string, string>)?.token;
  }
}
