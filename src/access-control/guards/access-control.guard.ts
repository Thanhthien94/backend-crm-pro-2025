import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControlService: AccessControlService,
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

    if (!user) {
      return false;
    }

    return this.accessControlService.canAccess(
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
  }
}
