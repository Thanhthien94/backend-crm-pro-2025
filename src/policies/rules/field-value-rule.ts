import {
  BasePolicyRule,
  PolicyAttributes,
} from '../interfaces/policy-rule.interface';

export enum Operator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
}

export class FieldValueRule extends BasePolicyRule {
  constructor(
    private field: string,
    private operator: Operator,
    private value: any,
  ) {
    super();
  }

  evaluate(attributes: PolicyAttributes): boolean {
    // Lấy giá trị từ resource hoặc user tùy thuộc vào cấu hình field
    let target: any;
    let fieldPath: string[];

    if (this.field.startsWith('user.')) {
      target = attributes.user;
      fieldPath = this.field.substring(5).split('.');
    } else if (this.field.startsWith('resource.')) {
      target = attributes.resource;
      fieldPath = this.field.substring(9).split('.');
    } else {
      // Mặc định là resource
      target = attributes.resource;
      fieldPath = this.field.split('.');
    }

    // Lấy giá trị của field
    let fieldValue = target;
    for (const path of fieldPath) {
      if (fieldValue === null || fieldValue === undefined) {
        return false;
      }
      fieldValue = fieldValue[path];
    }

    // So sánh giá trị
    switch (this.operator) {
      case Operator.EQUALS:
        return fieldValue === this.value;

      case Operator.NOT_EQUALS:
        return fieldValue !== this.value;

      case Operator.GREATER_THAN:
        return fieldValue > this.value;

      case Operator.LESS_THAN:
        return fieldValue < this.value;

      case Operator.CONTAINS:
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(this.value);
        } else if (Array.isArray(fieldValue)) {
          return fieldValue.includes(this.value);
        }
        return false;

      case Operator.NOT_CONTAINS:
        if (typeof fieldValue === 'string') {
          return !fieldValue.includes(this.value);
        } else if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(this.value);
        }
        return true;

      case Operator.STARTS_WITH:
        return (
          typeof fieldValue === 'string' && fieldValue.startsWith(this.value)
        );

      case Operator.ENDS_WITH:
        return (
          typeof fieldValue === 'string' && fieldValue.endsWith(this.value)
        );

      case Operator.IN:
        return Array.isArray(this.value) && this.value.includes(fieldValue);

      case Operator.NOT_IN:
        return Array.isArray(this.value) && !this.value.includes(fieldValue);

      default:
        return false;
    }
  }
}
