import { SetMetadata } from '@nestjs/common';

export const ACCESS_CONTROL_KEY = 'access_control';

export const AccessControl = (resource: string, action: string) =>
  SetMetadata(ACCESS_CONTROL_KEY, { resource, action });
