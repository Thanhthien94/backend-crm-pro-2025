import { User } from '../../users/entities/user.entity';

// Định nghĩa các thuộc tính của đối tượng để xác định policy
export interface PolicyAttributes {
  user: User;
  resource: any;
  action: string;
  context: any;
  //   resource: { assignedTo?: { toString(): string };
}

// Interface cho các rule
export interface PolicyRule {
  evaluate(attributes: PolicyAttributes): boolean;
}

// Base class cho các rule
export abstract class BasePolicyRule implements PolicyRule {
  abstract evaluate(attributes: PolicyAttributes): boolean;
}
