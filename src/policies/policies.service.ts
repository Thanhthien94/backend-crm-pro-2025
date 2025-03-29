import { Injectable } from '@nestjs/common';
import {
  BasePolicyRule,
  PolicyAttributes,
} from './interfaces/policy-rule.interface';
import { OwnershipRule } from './rules/ownership-rule';
import { SameOrganizationRule } from './rules/same-organization-rule';
import { RoleBasedRule } from './rules/role-based-rule';

@Injectable()
export class PoliciesService {
  // Lưu trữ các policy rule
  private policyMap: Map<string, BasePolicyRule[]> = new Map();

  constructor() {
    this.initializePolicies();
  }

  private initializePolicies() {
    // Định nghĩa các policy mặc định

    // Policy cho việc đọc khách hàng
    this.definePolicy('customer:read', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new RoleBasedRule(['admin', 'user']), // Người dùng phải có quyền admin hoặc user
    ]);

    // Policy cho việc cập nhật khách hàng
    this.definePolicy('customer:update', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new OwnershipRule(), // Người dùng phải là người quản lý khách hàng
    ]);

    // Policy cho việc xóa khách hàng
    this.definePolicy('customer:delete', [
      new SameOrganizationRule(), // Người dùng phải cùng tổ chức với khách hàng
      new RoleBasedRule(['admin']), // Chỉ admin mới được xóa khách hàng
    ]);

    // Thêm các policy khác ở đây...
  }

  definePolicy(policyKey: string, rules: BasePolicyRule[]) {
    this.policyMap.set(policyKey, rules);
  }

  // Kiểm tra xem user có quyền thực hiện action với resource không
  async evaluatePolicy(
    policyKey: string,
    user: any,
    resource: any,
    context: any = {},
  ): Promise<boolean> {
    const rules = this.policyMap.get(policyKey);

    if (!rules || rules.length === 0) {
      return false; // Không có rule nào được định nghĩa
    }

    const attributes: PolicyAttributes = {
      user,
      resource,
      action: policyKey.split(':')[1],
      context,
    };

    // Tất cả các rule phải pass
    return rules.every((rule) => rule.evaluate(attributes));
  }

  // Tạo policy key từ resource và action
  static createPolicyKey(resource: string, action: string): string {
    return `${resource}:${action}`;
  }
}
