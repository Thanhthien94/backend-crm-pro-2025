import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TaskActivity,
  TaskActivityDocument,
  ActivityType,
} from '../schemas/task-activity.schema';
import { Task } from '../schemas/task.schema';

@Injectable()
export class TaskActivityService {
  private readonly logger = new Logger(TaskActivityService.name);

  constructor(
    @InjectModel(TaskActivity.name)
    private taskActivityModel: Model<TaskActivityDocument>,
  ) {}

  /**
   * Ghi lại một hoạt động cho task
   */
  async logActivity(data: {
    taskId: string;
    activityType: ActivityType;
    performedBy: string;
    organizationId: string;
    details?: Record<string, any>;
    comment?: string;
  }): Promise<TaskActivityDocument> {
    try {
      const activity = new this.taskActivityModel({
        task: data.taskId,
        activityType: data.activityType,
        performedBy: data.performedBy,
        organization: data.organizationId,
        details: data.details || {},
        comment: data.comment,
      });

      return await activity.save();
    } catch (error) {
      this.logger.error(
        `Failed to log task activity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lấy lịch sử hoạt động của một task
   */
  async getTaskActivities(
    taskId: string,
    organizationId: string,
    limit = 20,
  ): Promise<TaskActivityDocument[]> {
    return this.taskActivityModel
      .find({
        task: taskId,
        organization: organizationId,
      })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Lấy hoạt động gần đây của các task trong tổ chức
   */
  async getRecentActivities(
    organizationId: string,
    limit = 10,
  ): Promise<TaskActivityDocument[]> {
    return this.taskActivityModel
      .find({ organization: organizationId })
      .populate('performedBy', 'name email')
      .populate('task', 'title status priority dueDate')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Lấy hoạt động gần đây của người dùng
   */
  async getUserActivities(
    userId: string,
    organizationId: string,
    limit = 10,
  ): Promise<TaskActivityDocument[]> {
    return this.taskActivityModel
      .find({
        performedBy: userId,
        organization: organizationId,
      })
      .populate('task', 'title status priority dueDate')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Lấy tổng hợp hoạt động theo loại
   */
  async getActivityStatsByType(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<ActivityType, number>> {
    // Tạo filter theo ngày nếu có
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const activityStats = await this.taskActivityModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Khởi tạo kết quả mặc định
    const result: Record<ActivityType, number> = {} as Record<
      ActivityType,
      number
    >;

    // Thiết lập giá trị mặc định là 0 cho mỗi loại
    Object.values(ActivityType).forEach((type) => {
      result[type] = 0;
    });

    // Cập nhật với giá trị thực từ kết quả aggregation
    activityStats.forEach((stat) => {
      result[stat._id as ActivityType] = stat.count;
    });

    return result;
  }

  /**
   * Lấy tổng hợp hoạt động theo người dùng
   */
  async getActivityStatsByUser(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 5,
  ): Promise<Array<{ userId: string; userName: string; count: number }>> {
    // Tạo filter theo ngày nếu có
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    return this.taskActivityModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$performedBy',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }

  /**
   * Xóa lịch sử hoạt động của một task
   */
  async deleteTaskActivities(taskId: string): Promise<number> {
    const result = await this.taskActivityModel.deleteMany({ task: taskId });
    return result.deletedCount;
  }
}
