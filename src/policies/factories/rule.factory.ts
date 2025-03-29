// src/policies/factories/rule.factory.ts
import { Injectable } from '@nestjs/common';
import { RuleType } from '../schemas/policy-rule.schema';
import { BasePolicyRule } from '../interfaces/policy-rule.interface';
import { OwnershipRule } from '../rules/ownership-rule';
import { SameOrganizationRule } from '../rules/same-organization-rule';
import { RoleBasedRule } from '../rules/role-based-rule';
import { CustomJsRule } from '../rules/custom-js-rule';
import { FieldValueRule } from '../rules/field-value-rule';

@Injectable()
export class RuleFactory {
  createRule(type: RuleType, config: Record<string, any>): BasePolicyRule {
    switch (type) {
      case RuleType.OWNERSHIP:
        return new OwnershipRule();

      case RuleType.SAME_ORGANIZATION:
        return new SameOrganizationRule();

      case RuleType.ROLE_BASED:
        if (!config.roles || !Array.isArray(config.roles)) {
          throw new Error('Role-based rule requires "roles" array in config');
        }
        return new RoleBasedRule(config.roles);

      case RuleType.CUSTOM_JS:
        if (!config.code || typeof config.code !== 'string') {
          throw new Error('Custom JS rule requires "code" string in config');
        }
        return new CustomJsRule(config.code);

      case RuleType.FIELD_VALUE:
        if (!config.field || !config.operator || config.value === undefined) {
          throw new Error(
            'Field value rule requires "field", "operator", and "value" in config',
          );
        }
        return new FieldValueRule(config.field, config.operator, config.value);

      default:
        throw new Error(`Unsupported rule type: ${type}`);
    }
  }
}
