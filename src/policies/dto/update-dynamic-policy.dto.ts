import { PartialType } from '@nestjs/swagger';
import { CreateDynamicPolicyDto } from './create-dynamic-policy.dto';

export class UpdateDynamicPolicyDto extends PartialType(
  CreateDynamicPolicyDto,
) {}
