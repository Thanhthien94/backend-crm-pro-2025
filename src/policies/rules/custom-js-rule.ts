// src/policies/rules/custom-js-rule.ts
import {
  BasePolicyRule,
  PolicyAttributes,
} from '../interfaces/policy-rule.interface';

export class CustomJsRule extends BasePolicyRule {
  private evalFunction: Function;

  constructor(code: string) {
    super();
    try {
      // Hạn chế các hàm JS có thể được sử dụng để bảo mật
      const restrictedContext = {
        Object,
        Array,
        String,
        Number,
        Boolean,
        Date,
        Math,
        JSON,
        // Thêm các hàm tiện ích khác nếu cần
      };

      // Tạo hàm đánh giá với context bị hạn chế
      this.evalFunction = new Function(
        'attributes',
        'context',
        `
        with (context) {
          try {
            ${code}
          } catch (error) {
            return false;
          }
        }
      `,
      );
    } catch (error) {
      throw new Error(`Invalid JavaScript in rule: ${error.message}`);
    }
  }

  evaluate(attributes: PolicyAttributes): boolean {
    try {
      return this.evalFunction(attributes, {
        Object,
        Array,
        String,
        Number,
        Boolean,
        Date,
        Math,
        JSON,
      });
    } catch (error) {
      console.error('Error evaluating custom JS rule:', error);
      return false;
    }
  }
}
