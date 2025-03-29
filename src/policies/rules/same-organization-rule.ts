import {
  BasePolicyRule,
  PolicyAttributes,
} from '../interfaces/policy-rule.interface';

export class SameOrganizationRule extends BasePolicyRule {
  evaluate(attributes: PolicyAttributes): boolean {
    const { user, resource } = attributes;

    // Kiểm tra nếu tài nguyên thuộc cùng tổ chức với người dùng
    if (!resource || !resource.organization) {
      return false;
    }

    return resource.organization.toString() === user.organization.toString();
  }
}
