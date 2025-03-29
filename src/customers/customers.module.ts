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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
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
