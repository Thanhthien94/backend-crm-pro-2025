// src/api-keys/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

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

  private extractApiKey(request: Request): string | undefined {
    const apiKey = request.headers['x-api-key'];
    return apiKey ? String(apiKey) : undefined;
  }
}
