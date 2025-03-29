import {
  BasePolicyRule,
  PolicyAttributes,
} from '../interfaces/policy-rule.interface';

export class RoleBasedRule extends BasePolicyRule {
  private roles: string[];

  constructor(roles: string[]) {
    super();
    this.roles = roles;
  }

  evaluate(attributes: PolicyAttributes): boolean {
    const { user } = attributes;

    return this.roles.includes(user.role);
  }
}
