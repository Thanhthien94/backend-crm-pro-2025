import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { ResourceType, ActionType } from '../schemas/permission.schema';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<{
      resource: ResourceType;
      action: ActionType;
    }>('permission', context.getHandler());

    if (!requiredPermission) {
      return true; // Không yêu cầu quyền riêng => cho phép
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return this.permissionsService.hasPermission(
      user,
      requiredPermission.resource,
      requiredPermission.action,
    );
  }
}
