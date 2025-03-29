// src/access-control/access-control.service.ts
import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { PoliciesService } from '../policies/policies.service';
import {
  ResourceType,
  ActionType,
} from '../permissions/schemas/permission.schema';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class AccessControlService {
  constructor(
    private permissionsService: PermissionsService,
    private policiesService: PoliciesService,
    private cacheService: CacheService,
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
    // Tạo cache key
    const cacheKey = `access_${user._id}_${resource}_${action}_${resourceData ? resourceData._id : 'no-resource'}`;

    // Kiểm tra cache
    if (this.cacheService.has(cacheKey)) {
      return this.cacheService.get(cacheKey) as boolean;
    }

    // 1. Kiểm tra RBAC trước
    const hasRole = await this.permissionsService.hasPermission(
      user,
      resource as ResourceType,
      action as ActionType,
    );

    // Nếu không có quyền cần thiết từ role, từ chối luôn
    if (!hasRole) {
      this.cacheService.set(cacheKey, false, 300000); // Cache trong 5 phút
      return false;
    }

    // 2. Kiểm tra ABAC nếu có dữ liệu tài nguyên
    let result = hasRole as boolean;
    if (resourceData) {
      const policyKey = PoliciesService.createPolicyKey(resource, action);
      result = await this.policiesService.evaluatePolicy(
        policyKey,
        user,
        resourceData,
        context,
      );
    }

    // Lưu kết quả vào cache
    this.cacheService.set(cacheKey, result, 300000); // Cache trong 5 phút

    return result;
  }

  /**
   * Xóa cache khi dữ liệu thay đổi
   */
  invalidateCache(userId: string, resource: string, resourceId?: string): void {
    // Có thể thực hiện xóa có điều kiện dựa trên pattern của key
    // Hoặc xóa toàn bộ cache liên quan đến user và resource
    const pattern = `access_${userId}_${resource}`;

    // Xóa tất cả các key bắt đầu bằng pattern
    for (const key of this.cacheService.getKeys()) {
      if (key.startsWith(pattern)) {
        this.cacheService.delete(key);
      }
    }
  }
}
