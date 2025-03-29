import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;

    // Lấy thông số rate limiting từ decorator
    const rateLimit = this.reflector.get<{
      points: number;
      duration: number;
    }>('rate-limit', context.getHandler()) || { points: 100, duration: 60 };

    const key = `rate-limit:${clientIp}:${request.route.path}`;

    // Lấy thông tin hiện tại
    const current = this.cacheService.get(key) || {
      count: 0,
      resetAt: Date.now() + rateLimit.duration * 1000,
    };

    // Kiểm tra nếu cần reset
    if (current.resetAt < Date.now()) {
      current.count = 0;
      current.resetAt = Date.now() + rateLimit.duration * 1000;
    }

    // Tăng số lần gọi
    current.count += 1;

    // Lưu lại thông tin
    this.cacheService.set(key, current, rateLimit.duration);

    // Thêm headers
    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', rateLimit.points);
    response.header(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimit.points - current.count),
    );
    response.header('X-RateLimit-Reset', Math.ceil(current.resetAt / 1000));

    // Kiểm tra nếu vượt quá giới hạn
    if (current.count > rateLimit.points) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
