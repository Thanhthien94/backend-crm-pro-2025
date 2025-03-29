// src/api-keys/guards/api-key-permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service';
import { AccessLogService } from '../../access-control/services/access-log.service';
import { ApiKeyDocument } from '../schemas/api-key.schema';

@Injectable()
export class ApiKeyPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
    private accessLogService: AccessLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const accessData = this.reflector.get<{
      resource: string;
      action: string;
    }>('access-control', context.getHandler());

    if (!accessData) {
      return true; // Không yêu cầu quyền cụ thể => cho phép
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const hasPermission = await this.apiKeysService.hasPermission(
      apiKey as unknown as ApiKeyDocument,
      accessData.resource,
      accessData.action,
    );

    // Ghi log kiểm tra quyền
    await this.accessLogService.logAccess({
      userId: 'api-key',
      resource: accessData.resource,
      action: accessData.action,
      resourceId: request.params.id,
      allowed: hasPermission,
      metadata: {
        apiKey: apiKey.substring(0, 8) + '...',
        url: request.url,
        method: request.method,
        ip: request.ip,
      },
    });

    if (!hasPermission) {
      throw new UnauthorizedException(
        `API key lacks permission for ${accessData.resource}:${accessData.action}`,
      );
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    const apiKey = request.headers['x-api-key'];
    return apiKey ? String(apiKey) : undefined;
  }
}
