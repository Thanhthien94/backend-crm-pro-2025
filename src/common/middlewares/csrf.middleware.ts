// src/common/middlewares/csrf.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Bỏ qua cho các request GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const storedToken = req.cookies['XSRF-TOKEN'];

    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    next();
  }
}
