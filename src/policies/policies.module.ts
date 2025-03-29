import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesService } from './policies.service';
import { RuleFactory } from './factories/rule.factory';
import {
  DynamicPolicy,
  DynamicPolicySchema,
} from './schemas/dynamic-policy.schema';
import { PolicyRule, PolicyRuleSchema } from './schemas/policy-rule.schema';
import { CustomersModule } from '../customers/customers.module';
import { DealsModule } from '../deals/deals.module';
import { TasksModule } from '../tasks/tasks.module';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DynamicPolicy.name, schema: DynamicPolicySchema },
      { name: PolicyRule.name, schema: PolicyRuleSchema },
    ]),
    forwardRef(() => AccessControlModule),
    forwardRef(() => CustomersModule),
    DealsModule,
    TasksModule,
  ],
  providers: [PoliciesService, RuleFactory],
  exports: [PoliciesService],
})
export class PoliciesModule {}
