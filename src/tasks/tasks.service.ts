import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private webhookService: WebhookService,
  ) {}

  async findAll(
    organizationId: string,
    filters: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      customerId?: string;
      dealId?: string;
      search?: string;
      dueBefore?: Date;
      dueAfter?: Date;
      isOverdue?: boolean;
    } = {},
    page = 1,
    limit = 10,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
  }> {
    type QueryType = {
      organization: string;
      status?: string | { $in: string[] };
      priority?: string;
      assignedTo?: string;
      customer?: string;
      deal?: string;
      dueDate?: { $lt?: Date; $gt?: Date };
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.customerId) query.customer = filters.customerId;
    if (filters.dealId) query.deal = filters.dealId;

    // Handle date filters
    if (!query.dueDate) query.dueDate = {};
    if (filters.dueBefore) query.dueDate.$lt = filters.dueBefore;
    if (filters.dueAfter) query.dueDate.$gt = filters.dueAfter;

    // Handle overdue tasks
    if (filters.isOverdue) {
      query.status = { $in: ['todo', 'in_progress'] };
      if (!query.dueDate) query.dueDate = {};
      query.dueDate.$lt = new Date();
    }

    // Handle search filter
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await this.taskModel.countDocuments(query);

    const tasks = await this.taskModel
      .find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage')
      .skip(startIndex)
      .limit(limit)
      .sort({ dueDate: 1 }); // Sort by due date ascending

    return { tasks, total };
  }

  async findById(id: string, organizationId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findOne({
        _id: id,
        organization: organizationId,
      })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage');

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(
    createTaskDto: CreateTaskDto,
    organizationId: string,
    userId: string,
  ): Promise<TaskDocument> {
    const task = new this.taskModel({
      ...createTaskDto,
      organization: organizationId,
      assignedTo: createTaskDto.assignedTo || userId,
      createdBy: userId,
    });

    const savedTask = await task.save();

    // Trigger webhook
    try {
      // Convert to plain object
      const taskObj = {
        id: savedTask._id ? savedTask._id.toString() : '',
        title: savedTask.title,
        status: savedTask.status,
        priority: savedTask.priority,
        dueDate: savedTask.dueDate,
        assignedTo: savedTask.assignedTo ? savedTask.assignedTo.toString() : '',
        organization: organizationId,
      };

      // Trigger webhook
      await this.webhookService.triggerWebhook(
        WebhookEvent.TASK_CREATED,
        organizationId,
        taskObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return savedTask;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    organizationId: string,
  ): Promise<TaskDocument> {
    const oldTask = await this.findById(id, organizationId);
    const oldStatus = oldTask.status;

    // Check if we're completing the task
    if (updateTaskDto.status === 'completed' && oldStatus !== 'completed') {
      updateTaskDto.completedAt = new Date();
    }

    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateTaskDto,
        { new: true, runValidators: true },
      )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage');

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Trigger webhook for update
    try {
      // Convert to plain object
      const taskObj = {
        id: task._id ? task._id.toString() : '',
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo ? task.assignedTo.toString() : '',
        organization: organizationId,
      };

      // If task was completed, trigger the completed webhook
      if (task.status === 'completed' && oldStatus !== 'completed') {
        await this.webhookService.triggerWebhook(
          WebhookEvent.TASK_COMPLETED,
          organizationId,
          taskObj,
        );
      }
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return task;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const task = await this.taskModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await task.deleteOne();

    // Trigger webhook
    try {
      // Trigger webhook for deletion
      await this.webhookService.triggerWebhook(
        WebhookEvent.TASK_DELETED,
        organizationId,
        { id },
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return true;
  }

  async getUpcomingTasks(
    organizationId: string,
    userId: string,
  ): Promise<TaskDocument[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return this.taskModel
      .find({
        organization: organizationId,
        assignedTo: userId,
        status: { $in: ['todo', 'in_progress'] },
        dueDate: { $gte: today, $lte: nextWeek },
      })
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage')
      .sort({ dueDate: 1 })
      .limit(10);
  }

  async getOverdueTasks(
    organizationId: string,
    userId: string,
  ): Promise<TaskDocument[]> {
    const today = new Date();

    return this.taskModel
      .find({
        organization: organizationId,
        assignedTo: userId,
        status: { $in: ['todo', 'in_progress'] },
        dueDate: { $lt: today },
      })
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage')
      .sort({ dueDate: 1 })
      .limit(10);
  }

  async getTasksSummary(
    organizationId: string,
    userId?: string,
  ): Promise<{
    total: number;
    completed: number;
    overdue: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    // Base query for the organization
    const baseQuery = { organization: organizationId };

    // Add user filter if provided
    if (userId) {
      baseQuery['assignedTo'] = userId;
    }

    // Get total counts
    const total = await this.taskModel.countDocuments(baseQuery);

    // Get completed count
    const completed = await this.taskModel.countDocuments({
      ...baseQuery,
      status: 'completed',
    });

    // Get overdue count
    const overdue = await this.taskModel.countDocuments({
      ...baseQuery,
      status: { $in: ['todo', 'in_progress'] },
      dueDate: { $lt: new Date() },
    });

    // Get counts by status
    const statusAggregation = await this.taskModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus = statusAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Get counts by priority
    const priorityAggregation = await this.taskModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const byPriority = priorityAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      total,
      completed,
      overdue,
      byStatus,
      byPriority,
    };
  }
}
