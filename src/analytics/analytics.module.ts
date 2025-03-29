import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Deal, DealSchema } from '../deals/schemas/deal.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deal.name, schema: DealSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    AuthModule,
    UsersModule
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
