import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { WebhookModule } from '../webhook/webhook.module';
import { UsersModule } from '../users/users.module';
import { CustomFieldsModule } from 'src/custom-fields/custom-fields.module';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { DealsModule } from '../deals/deals.module';
import { TasksModule } from '../tasks/tasks.module';
import { Deal, DealSchema } from 'src/deals/schemas/deal.schema';
import { Task, TaskSchema } from 'src/tasks/schemas/task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    WebhookModule,
    UsersModule,
    CustomFieldsModule,
    forwardRef(() => AccessControlModule),
    forwardRef(() => DealsModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
