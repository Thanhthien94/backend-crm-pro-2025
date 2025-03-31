import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './tasks.controller';
import { TaskActivityController } from './controllers/task-activity.controller';
import { TasksService } from './tasks.service';
import { TaskActivityService } from './services/task-activity.service';
import { Task, TaskSchema } from './schemas/task.schema';
import {
  TaskActivity,
  TaskActivitySchema,
} from './schemas/task-activity.schema';
import { WebhookModule } from '../webhook/webhook.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AccessControlModule } from 'src/access-control/access-control.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: TaskActivity.name, schema: TaskActivitySchema },
    ]),
    forwardRef(() => WebhookModule),
    AuthModule,
    UsersModule,
    forwardRef(() => AccessControlModule),
  ],
  controllers: [TasksController, TaskActivityController],
  providers: [TasksService, TaskActivityService],
  exports: [TasksService, TaskActivityService],
})
export class TasksModule {}
