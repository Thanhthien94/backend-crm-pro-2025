// src/access-control/guards/access-control.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';
import { AccessLogService } from '../services/access-log.service';

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControlService: AccessControlService,
    private accessLogService: AccessLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessData = this.reflector.get<{
      resource: string;
      action: string;
    }>('access-control', context.getHandler());

    if (!accessData) {
      return true; // Không yêu cầu quyền => cho phép
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceData = request.resourceData; // Đã được thiết lập bởi ResourceInterceptor
    const resourceId = resourceData?._id?.toString();

    if (!user) {
      // Ghi log khi không có user
      await this.accessLogService.logAccess({
        userId: 'anonymous',
        resource: accessData.resource,
        action: accessData.action,
        resourceId,
        allowed: false,
        metadata: { reason: 'No authenticated user' },
      });
      return false;
    }

    const allowed = await this.accessControlService.canAccess(
      user,
      accessData.resource,
      accessData.action,
      resourceData,
      {
        params: request.params,
        query: request.query,
        body: request.body,
      },
    );

    // Ghi log kết quả kiểm tra quyền
    await this.accessLogService.logAccess({
      userId: user._id?.toString(),
      resource: accessData.resource,
      action: accessData.action,
      resourceId,
      allowed,
      metadata: {
        url: request.url,
        method: request.method,
        ip: request.ip,
      },
    });

    return allowed;
  }
}
