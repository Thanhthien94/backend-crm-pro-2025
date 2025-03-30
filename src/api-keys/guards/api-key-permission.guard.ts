import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service';
import { AccessLogService } from '../../access-control/services/access-log.service';
import { ApiKeyDocument } from '../schemas/api-key.schema';

@Injectable()
export class ApiKeyPermissionGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyPermissionGuard.name);

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
    let apiKey = this.extractApiKey(request);
    let validApiKey: ApiKeyDocument | null = null;

    // Nếu không có API key trong header nhưng có user (JWT auth)
    if (!apiKey && request.user && request.user.organization) {
      try {
        // Tìm API key có sẵn của tổ chức
        const organizationId = request.user.organization.toString();
        const availableKeys = await this.apiKeysService.findAll(
          organizationId,
          { active: true },
        );

        if (availableKeys && availableKeys.length > 0) {
          // Ưu tiên key có nhiều quyền nhất
          const adminKey = availableKeys.find((key) =>
            key.permissions.includes('admin'),
          );
          if (adminKey) {
            validApiKey = adminKey;
            apiKey = adminKey.key;
          } else {
            const writeKey = availableKeys.find((key) =>
              key.permissions.includes('write'),
            );
            if (writeKey) {
              validApiKey = writeKey;
              apiKey = writeKey.key;
            } else {
              validApiKey = availableKeys[0];
              apiKey = availableKeys[0].key;
            }
          }

          this.logger.debug(
            `Automatically applied API key for organization ${organizationId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error finding API key for organization: ${error.message}`,
        );
      }
    }

    // Nếu có API key từ header nhưng chưa validation
    if (apiKey && !validApiKey) {
      validApiKey = await this.apiKeysService.validateApiKey(apiKey);
    }

    // Nếu không có API key hợp lệ, từ chối
    if (!apiKey || !validApiKey) {
      throw new UnauthorizedException('API key is missing or invalid');
    }

    // Gắn thông tin API key vào request
    request.apiKey = validApiKey;
    request.organization = validApiKey.organization;
    request.permissions = validApiKey.permissions;

    // Kiểm tra quyền của API key
    const hasPermission = await this.apiKeysService.hasPermission(
      validApiKey,
      accessData.resource,
      accessData.action,
    );

    // Ghi log kiểm tra quyền
    await this.accessLogService.logAccess({
      userId: request.user ? request.user._id.toString() : 'api-key',
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

  private extractApiKey(request: any): string | undefined {
    const apiKey = request.headers['x-api-key'];
    return apiKey ? String(apiKey) : undefined;
  }
}
