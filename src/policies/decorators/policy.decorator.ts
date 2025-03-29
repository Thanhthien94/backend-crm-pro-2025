import { SetMetadata } from '@nestjs/common';

export const Policy = (resource: string, action: string) =>
  SetMetadata('policy', { resource, action });
