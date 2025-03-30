import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let apiKey = this.extractApiKey(request);

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
            apiKey = adminKey.key;
          } else {
            const writeKey = availableKeys.find((key) =>
              key.permissions.includes('write'),
            );
            if (writeKey) {
              apiKey = writeKey.key;
            } else {
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

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const validApiKey = await this.apiKeysService.validateApiKey(apiKey);

    if (!validApiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach organization and permissions to request
    request.apiKey = validApiKey;
    request.organization = validApiKey.organization;
    request.permissions = validApiKey.permissions;

    return true;
  }

  private extractApiKey(request: any): string | undefined {
    const apiKey = request.headers['x-api-key'];
    return apiKey ? String(apiKey) : undefined;
  }
}
