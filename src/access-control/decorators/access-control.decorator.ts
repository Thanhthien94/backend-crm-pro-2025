import { SetMetadata } from '@nestjs/common';

export const AccessControl = (resource: string, action: string) =>
  SetMetadata('access-control', { resource, action });
