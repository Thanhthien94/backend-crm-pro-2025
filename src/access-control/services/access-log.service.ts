import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessLog, AccessLogDocument } from '../schemas/access-log.schema';

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(
    @InjectModel(AccessLog.name)
    private accessLogModel: Model<AccessLogDocument>,
  ) {}

  async logAccess(data: {
    userId: string;
    resource: string;
    action: string;
    resourceId?: string;
    allowed: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.accessLogModel.create({
        userId: data.userId,
        resource: data.resource,
        action: data.action,
        resourceId: data.resourceId,
        allowed: data.allowed,
        metadata: data.metadata,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log access: ${error.message}`, error.stack);
    }
  }

  async getAccessLogs(
    filters: {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      allowed?: boolean;
    },
    page = 1,
    limit = 20,
  ): Promise<{
    logs: AccessLogDocument[];
    total: number;
  }> {
    // Tạo query dựa vào filter
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.resource) query.resource = filters.resource;
    if (filters.action) query.action = filters.action;
    if (filters.allowed !== undefined) query.allowed = filters.allowed;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    // Đếm tổng số bản ghi phù hợp với query
    const total = await this.accessLogModel.countDocuments(query);

    // Lấy dữ liệu có phân trang và chọn lọc field
    const logs = await this.accessLogModel
      .find(query)
      .select(
        'userId resource action resourceId allowed timestamp metadata.url metadata.method metadata.ip',
      )
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return { logs, total };
  }
  /**
   * Lấy tổng hợp log truy cập
   */
  async getAccessLogsSummary(startDate?: Date, endDate?: Date) {
    // Tạo query filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    // Thống kê theo resource và action
    const byResourceAndAction = await this.accessLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: {
            resource: '$resource',
            action: '$action',
          },
          total: { $sum: 1 },
          allowed: {
            $sum: { $cond: [{ $eq: ['$allowed', true] }, 1, 0] },
          },
          denied: {
            $sum: { $cond: [{ $eq: ['$allowed', false] }, 1, 0] },
          },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    // Thống kê theo ngày
    const byDate = await this.accessLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
          },
          total: { $sum: 1 },
          allowed: {
            $sum: { $cond: [{ $eq: ['$allowed', true] }, 1, 0] },
          },
          denied: {
            $sum: { $cond: [{ $eq: ['$allowed', false] }, 1, 0] },
          },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]);

    // Thống kê tổng quát
    const totalStats = await this.accessLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          allowed: {
            $sum: { $cond: [{ $eq: ['$allowed', true] }, 1, 0] },
          },
          denied: {
            $sum: { $cond: [{ $eq: ['$allowed', false] }, 1, 0] },
          },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueResources: { $addToSet: '$resource' },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          allowed: 1,
          denied: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueResources: { $size: '$uniqueResources' },
        },
      },
    ]);

    return {
      total:
        totalStats.length > 0
          ? totalStats[0]
          : {
              total: 0,
              allowed: 0,
              denied: 0,
              uniqueUsers: 0,
              uniqueResources: 0,
            },
      byResourceAndAction: byResourceAndAction.map((item) => ({
        resource: item._id.resource,
        action: item._id.action,
        total: item.total,
        allowed: item.allowed,
        denied: item.denied,
      })),
      byDate: byDate.map((item) => ({
        date: item._id.date,
        total: item.total,
        allowed: item.allowed,
        denied: item.denied,
      })),
    };
  }

  /**
   * Lấy thống kê hoạt động người dùng
   */
  async getUserActivity(startDate?: Date, endDate?: Date, limit = 10) {
    // Tạo query filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    // Thống kê hoạt động theo người dùng
    return this.accessLogModel.aggregate([
      {
        $match: {
          ...dateFilter,
          userId: { $nin: ['anonymous', 'api-key'] },
        },
      },
      {
        $group: {
          _id: '$userId',
          total: { $sum: 1 },
          allowed: {
            $sum: { $cond: [{ $eq: ['$allowed', true] }, 1, 0] },
          },
          denied: {
            $sum: { $cond: [{ $eq: ['$allowed', false] }, 1, 0] },
          },
          lastActivity: { $max: '$timestamp' },
          resources: { $addToSet: '$resource' },
        },
      },
      {
        $sort: { total: -1 },
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
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$user.name',
          total: 1,
          allowed: 1,
          denied: 1,
          lastActivity: 1,
          resourcesCount: { $size: '$resources' },
        },
      },
    ]);
  }

  /**
   * Lấy thống kê các truy cập bị từ chối
   */
  async getDeniedAccess(startDate?: Date, endDate?: Date, limit = 10) {
    // Tạo query filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    return this.accessLogModel.aggregate([
      {
        $match: {
          ...dateFilter,
          allowed: false,
        },
      },
      {
        $group: {
          _id: {
            resource: '$resource',
            action: '$action',
          },
          count: { $sum: 1 },
          users: { $addToSet: '$userId' },
          lastAttempt: { $max: '$timestamp' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          resource: '$_id.resource',
          action: '$_id.action',
          count: 1,
          uniqueUsers: { $size: '$users' },
          lastAttempt: 1,
        },
      },
    ]);
  }
}
