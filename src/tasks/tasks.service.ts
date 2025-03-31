// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';
import { TaskActivityService } from './services/task-activity.service';
import { ActivityType } from './schemas/task-activity.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private webhookService: WebhookService,
    private taskActivityService: TaskActivityService,
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

    // Ghi lại hoạt động tạo task
    await this.taskActivityService.logActivity({
      taskId: savedTask._id.toString(),
      activityType: ActivityType.CREATED,
      performedBy: userId,
      organizationId,
      details: {
        title: savedTask.title,
        dueDate: savedTask.dueDate,
        priority: savedTask.priority,
        status: savedTask.status,
        assignedTo: savedTask.assignedTo.toString(),
      },
    });

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
    userId?: string,
  ): Promise<TaskDocument> {
    const oldTask = await this.findById(id, organizationId);
    const oldStatus = oldTask.status;
    const oldPriority = oldTask.priority;
    const oldAssignee = oldTask.assignedTo ? oldTask.assignedTo.toString() : '';
    const oldDueDate = oldTask.dueDate;

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

    // Nếu có userId, ghi lại các hoạt động thay đổi
    if (userId) {
      // Các thay đổi
      const changes: Record<string, any> = {};
      let activityType = ActivityType.UPDATED;

      // Kiểm tra từng loại thay đổi cụ thể
      if (updateTaskDto.status && oldStatus !== updateTaskDto.status) {
        changes.status = { from: oldStatus, to: updateTaskDto.status };
        activityType = ActivityType.STATUS_CHANGED;

        // Nếu task hoàn thành, đổi thành COMPLETED
        if (updateTaskDto.status === 'completed') {
          activityType = ActivityType.COMPLETED;
        }
      }

      if (updateTaskDto.priority && oldPriority !== updateTaskDto.priority) {
        changes.priority = { from: oldPriority, to: updateTaskDto.priority };
        if (activityType === ActivityType.UPDATED) {
          activityType = ActivityType.PRIORITY_CHANGED;
        }
      }

      if (
        updateTaskDto.assignedTo &&
        oldAssignee !== updateTaskDto.assignedTo
      ) {
        changes.assignedTo = {
          from: oldAssignee,
          to: updateTaskDto.assignedTo,
        };
        if (activityType === ActivityType.UPDATED) {
          activityType = ActivityType.ASSIGNED;
        }
      }

      if (
        updateTaskDto.dueDate &&
        oldDueDate.getTime() !== new Date(updateTaskDto.dueDate).getTime()
      ) {
        changes.dueDate = {
          from: oldDueDate,
          to: updateTaskDto.dueDate,
        };
        if (activityType === ActivityType.UPDATED) {
          activityType = ActivityType.DUE_DATE_CHANGED;
        }
      }

      // Ghi lại hoạt động nếu có thay đổi
      if (Object.keys(changes).length > 0) {
        await this.taskActivityService.logActivity({
          taskId: task._id.toString(),
          activityType,
          performedBy: userId,
          organizationId,
          details: changes,
        });
      }
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

  async remove(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<boolean> {
    const task = await this.taskModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Ghi lại hoạt động xóa task nếu có userId
    if (userId) {
      await this.taskActivityService.logActivity({
        taskId: task._id.toString(),
        activityType: ActivityType.DELETED,
        performedBy: userId,
        organizationId,
        details: {
          title: task.title,
          status: task.status,
        },
      });
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

  /**
   * Thêm bình luận vào task
   */
  async addComment(
    taskId: string,
    comment: string,
    organizationId: string,
    userId: string,
  ): Promise<TaskDocument> {
    // Kiểm tra task tồn tại
    const task = await this.findById(taskId, organizationId);

    // Ghi lại hoạt động thêm bình luận
    await this.taskActivityService.logActivity({
      taskId,
      activityType: ActivityType.COMMENT_ADDED,
      performedBy: userId,
      organizationId,
      comment,
    });

    return task;
  }

  /**
   * Lấy lịch sử hoạt động của task
   */
  async getTaskActivities(taskId: string, organizationId: string, limit = 20) {
    return this.taskActivityService.getTaskActivities(
      taskId,
      organizationId,
      limit,
    );
  }

  /**
   * Lấy hoạt động gần đây trong tổ chức
   */
  async getRecentActivities(organizationId: string, limit = 10) {
    return this.taskActivityService.getRecentActivities(organizationId, limit);
  }
}
