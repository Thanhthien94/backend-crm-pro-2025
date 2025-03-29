import {
  BasePolicyRule,
  PolicyAttributes,
} from '../interfaces/policy-rule.interface';

export class OwnershipRule extends BasePolicyRule {
  evaluate(attributes: PolicyAttributes): boolean {
    const { user, resource } = attributes;

    // Kiểm tra nếu người dùng là chủ sở hữu của tài nguyên
    if (!resource || !resource.assignedTo || !user || !user._id) {
      return false;
    }

    return resource.assignedTo.toString() === user._id.toString();
  }
}
