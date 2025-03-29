import { PartialType } from '@nestjs/swagger';
import { CreatePolicyRuleDto } from './create-policy-rule.dto';

export class UpdatePolicyRuleDto extends PartialType(CreatePolicyRuleDto) {}
