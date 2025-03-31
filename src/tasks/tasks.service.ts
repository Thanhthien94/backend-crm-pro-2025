import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';
import { RelatedEntityType } from '../common/enums/related-entity-type.enum';

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
      relatedTo?: string;
      relatedType?: string;
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
      relatedTo?: string;
      relatedType?: string;
      dueDate?: { $lt?: Date; $gt?: Date };
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.customerId) query.customer = filters.customerId;
    if (filters.dealId) query.deal = filters.dealId;
    if (filters.relatedTo) query.relatedTo = filters.relatedTo;
    if (filters.relatedType) query.relatedType = filters.relatedType;

    // Xử lý bộ lọc theo ngày, kiểm tra giá trị hợp lệ
    if (filters.dueBefore instanceof Date || filters.dueAfter instanceof Date) {
      query.dueDate = {};

      if (filters.dueBefore instanceof Date) {
        query.dueDate.$lt = filters.dueBefore;
      }

      if (filters.dueAfter instanceof Date) {
        query.dueDate.$gt = filters.dueAfter;
      }
    }

    // Xử lý các task quá hạn
    if (filters.isOverdue) {
      query.status = { $in: ['todo', 'in_progress'] };
      if (!query.dueDate) query.dueDate = {};
      query.dueDate.$lt = new Date();
    }

    // Xử lý bộ lọc tìm kiếm
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
      .populate('relatedTo')
      .skip(startIndex)
      .limit(limit)
      .sort({ dueDate: 1 }); // Sắp xếp theo dueDate tăng dần

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
      .populate('deal', 'name value stage')
      .populate('relatedTo');

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
    // Kiểm tra xem cả relatedTo và relatedType có được cung cấp hay không
    if (
      (createTaskDto.relatedTo && !createTaskDto.relatedType) ||
      (!createTaskDto.relatedTo && createTaskDto.relatedType)
    ) {
      throw new Error(
        'Cả relatedTo và relatedType phải được cung cấp cùng nhau',
      );
    }

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
        customer: savedTask.customer ? savedTask.customer.toString() : null,
        deal: savedTask.deal ? savedTask.deal.toString() : null,
        relatedTo: savedTask.relatedTo ? savedTask.relatedTo.toString() : null,
        relatedType: savedTask.relatedType || null,
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

    // Kiểm tra xem cả relatedTo và relatedType có được cung cấp hay không
    if (
      (updateTaskDto.relatedTo && !updateTaskDto.relatedType) ||
      (!updateTaskDto.relatedTo && updateTaskDto.relatedType)
    ) {
      throw new Error(
        'Cả relatedTo và relatedType phải được cung cấp cùng nhau',
      );
    }

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
      .populate('deal', 'name value stage')
      .populate('relatedTo');

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
        customer: task.customer ? task.customer.toString() : null,
        deal: task.deal ? task.deal.toString() : null,
        relatedTo: task.relatedTo ? task.relatedTo.toString() : null,
        relatedType: task.relatedType || null,
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
      .populate('relatedTo')
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
      .populate('relatedTo')
      .sort({ dueDate: 1 })
      .limit(10);
  }

  /**
   * Tìm task theo đối tượng liên kết
   */
  async findByRelation(
    organizationId: string,
    relatedType: RelatedEntityType,
    relatedId: string,
  ): Promise<TaskDocument[]> {
    // Xử lý các trường hợp đặc biệt (customer, deal) và trường hợp đa hình (relatedTo)
    let query: any = { organization: organizationId };

    // Kiểm tra loại đối tượng và thiết lập query phù hợp
    if (relatedType === RelatedEntityType.CUSTOMER) {
      query.customer = relatedId;
    } else if (relatedType === RelatedEntityType.DEAL) {
      query.deal = relatedId;
    } else {
      query.relatedTo = relatedId;
      query.relatedType = relatedType;
    }

    return this.taskModel
      .find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('customer', 'name email company')
      .populate('deal', 'name value stage')
      .populate('relatedTo')
      .sort({ dueDate: 1 })
      .exec();
  }

  /**
   * Xóa nhiều task cùng lúc
   */
  async bulkDelete(
    ids: string[],
    organizationId: string,
  ): Promise<{ deletedCount: number }> {
    // Xác thực các ID thuộc về tổ chức
    const tasks = await this.taskModel.find({
      _id: { $in: ids },
      organization: organizationId,
    });

    if (tasks.length !== ids.length) {
      throw new Error('Một số task không tồn tại hoặc không thuộc tổ chức này');
    }

    // Xóa tasks
    const result = await this.taskModel.deleteMany({
      _id: { $in: ids },
      organization: organizationId,
    });

    // Trigger webhooks cho từng task đã xóa
    for (const task of tasks) {
      try {
        await this.webhookService.triggerWebhook(
          WebhookEvent.TASK_DELETED,
          organizationId,
          { id: task._id.toString() },
        );
      } catch (error) {
        console.error(
          `Failed to trigger webhook for task ${task._id}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return { deletedCount: result.deletedCount };
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
    byRelatedType: Record<string, number>;
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

    // Get counts by relatedType
    const relatedTypeAggregation = await this.taskModel.aggregate([
      { $match: { ...baseQuery, relatedType: { $exists: true, $ne: null } } },
      { $group: { _id: '$relatedType', count: { $sum: 1 } } },
    ]);

    const byRelatedType = relatedTypeAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      total,
      completed,
      overdue,
      byStatus,
      byPriority,
      byRelatedType,
    };
  }
}
