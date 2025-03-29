import { SetMetadata } from '@nestjs/common';
import { ResourceType, ActionType } from '../schemas/permission.schema';

export const RequirePermission = (resource: ResourceType, action: ActionType) =>
  SetMetadata('permission', { resource, action });
