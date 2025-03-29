import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Ghi log hành động
   */
  async log(data: {
    userId: string;
    action: AuditAction;
    resource?: string;
    resourceId?: string;
    organizationId: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.auditLogModel.create({
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        organization: data.organizationId,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`, error.stack);
    }
  }

  /**
   * Lấy log audit
   */
  async getAuditLogs(
    organizationId: string,
    filters: {
      userId?: string;
      action?: AuditAction;
      resource?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<{
    logs: AuditLogDocument[];
    total: number;
  }> {
    const query: any = { organization: organizationId };

    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const total = await this.auditLogModel.countDocuments(query);
    const logs = await this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email')
      .exec();

    return { logs, total };
  }

  /**
   * Lấy thống kê audit log
   */
  async getAuditSummary(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const dateFilter: any = { organization: organizationId };
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    // Thống kê theo hành động
    const byAction = await this.auditLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Thống kê theo tài nguyên
    const byResource = await this.auditLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Thống kê theo người dùng
    const byUser = await this.auditLogModel.aggregate([
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
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
          userId: '$_id',
          userName: '$user.name',
          count: 1,
        },
      },
    ]);

    // Thống kê theo ngày
    const byDate = await this.auditLogModel.aggregate([
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
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]);

    return {
      byAction: byAction.map((item) => ({
        action: item._id,
        count: item.count,
      })),
      byResource: byResource.map((item) => ({
        resource: item._id,
        count: item.count,
      })),
      byUser,
      byDate: byDate.map((item) => ({
        date: item._id.date,
        count: item.count,
      })),
    };
  }
}