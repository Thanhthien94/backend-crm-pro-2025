import { Module, forwardRef } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CustomersModule } from '../customers/customers.module';
import { DealsModule } from '../deals/deals.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    forwardRef(() => CustomersModule), 
    DealsModule, 
    TasksModule
  ],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
