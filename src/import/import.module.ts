import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Deal, DealSchema } from '../deals/schemas/deal.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { UsersModule } from '../users/users.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
    UsersModule,
    CustomFieldsModule,
    AuthModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
