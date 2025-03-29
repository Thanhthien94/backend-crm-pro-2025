import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { PoliciesService } from '../policies/policies.service';
import {
  ResourceType,
  ActionType,
} from '../permissions/schemas/permission.schema';

@Injectable()
export class AccessControlService {
  constructor(
    private permissionsService: PermissionsService,
    private policiesService: PoliciesService,
  ) {}

  /**
   * Kiểm tra quyền truy cập kết hợp cả RBAC và ABAC
   */
  async canAccess(
    user: any,
    resource: string,
    action: string,
    resourceData?: any,
    context?: any,
  ): Promise<boolean> {
    // 1. Kiểm tra RBAC trước
    const hasRole = await this.permissionsService.hasPermission(
      user,
      resource as ResourceType,
      action as ActionType,
    );

    // Nếu không có quyền cần thiết từ role, từ chối luôn
    if (!hasRole) {
      return false;
    }

    // 2. Kiểm tra ABAC nếu có dữ liệu tài nguyên
    if (resourceData) {
      const policyKey = PoliciesService.createPolicyKey(resource, action);
      return this.policiesService.evaluatePolicy(
        policyKey,
        user,
        resourceData,
        context,
      );
    }

    // Nếu chỉ kiểm tra RBAC, trả về kết quả
    return hasRole;
  }
}
