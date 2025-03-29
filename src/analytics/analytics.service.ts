import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import {
  Customer,
  CustomerDocument,
} from '../customers/schemas/customer.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  private getDateRangeQuery(startDate?: string, endDate?: string) {
    const dateQuery: any = {};

    if (startDate) {
      dateQuery.$gte = new Date(startDate);
    }

    if (endDate) {
      dateQuery.$lte = new Date(endDate);
    }

    return dateQuery;
  }

  private getTimeframeProjection(timeframe: string) {
    switch (timeframe) {
      case 'daily':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
      case 'weekly':
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
      case 'quarterly':
        return {
          year: { $year: '$createdAt' },
          quarter: {
            $ceil: {
              $divide: [{ $month: '$createdAt' }, 3],
            },
          },
        };
      case 'yearly':
        return {
          year: { $year: '$createdAt' },
        };
      case 'monthly':
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
    }
  }

  private formatTimeframePeriod(timeframe: string, groupId: any) {
    switch (timeframe) {
      case 'daily':
        return `${groupId.year}-${String(groupId.month).padStart(2, '0')}-${String(groupId.day).padStart(2, '0')}`;
      case 'weekly':
        return `${groupId.year}-W${String(groupId.week).padStart(2, '0')}`;
      case 'quarterly':
        return `${groupId.year}-Q${groupId.quarter}`;
      case 'yearly':
        return `${groupId.year}`;
      case 'monthly':
      default:
        return `${groupId.year}-${String(groupId.month).padStart(2, '0')}`;
    }
  }

  async getSalesAnalytics(
    organizationId: string,
    queryParams: QueryAnalyticsDto,
  ) {
    const { timeframe = 'monthly', startDate, endDate } = queryParams;

    // Prepare date range filter
    const dateQuery = this.getDateRangeQuery(startDate, endDate);
    const dateFilter =
      Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // Get timeframe projection
    const timeframeProjection = this.getTimeframeProjection(timeframe);

    // Aggregate deals by timeframe
    const salesByTimeframe = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: timeframeProjection,
          totalValue: { $sum: '$value' },
          count: { $sum: 1 },
          avgValue: { $avg: '$value' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.week': 1,
          '_id.quarter': 1,
        },
      },
    ]);

    // Format results
    const formattedSalesByTimeframe = salesByTimeframe.map((item) => ({
      period: this.formatTimeframePeriod(timeframe, item._id),
      totalValue: item.totalValue,
      count: item.count,
      avgValue: item.avgValue,
    }));

    // Aggregate deals by stage
    const salesByStage = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$stage',
          totalValue: { $sum: '$value' },
          count: { $sum: 1 },
          avgValue: { $avg: '$value' },
        },
      },
      {
        $sort: { totalValue: -1 },
      },
    ]);

    // Format results
    const formattedSalesByStage = salesByStage.map((item) => ({
      stage: item._id,
      totalValue: item.totalValue,
      count: item.count,
      avgValue: item.avgValue,
    }));

    // Get won vs lost deals
    const salesOutcomes = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          stage: { $in: ['closed-won', 'closed-lost'] },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$stage',
          totalValue: { $sum: '$value' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate win rate
    const wonDeals = salesOutcomes.find(
      (item) => item._id === 'closed-won',
    ) || { count: 0 };
    const lostDeals = salesOutcomes.find(
      (item) => item._id === 'closed-lost',
    ) || { count: 0 };
    const totalClosedDeals = wonDeals.count + lostDeals.count;
    const winRate =
      totalClosedDeals > 0 ? (wonDeals.count / totalClosedDeals) * 100 : 0;

    return {
      salesByTimeframe: formattedSalesByTimeframe,
      salesByStage: formattedSalesByStage,
      winRate: parseFloat(winRate.toFixed(2)),
      totalWon: {
        count: wonDeals.count,
        value: wonDeals.totalValue || 0,
      },
      totalLost: {
        count: lostDeals.count,
        value: lostDeals.totalValue || 0,
      },
    };
  }

  async getCustomerAnalytics(
    organizationId: string,
    queryParams: QueryAnalyticsDto,
  ) {
    const { timeframe = 'monthly', startDate, endDate } = queryParams;

    // Prepare date range filter
    const dateQuery = this.getDateRangeQuery(startDate, endDate);
    const dateFilter =
      Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // Get timeframe projection
    const timeframeProjection = this.getTimeframeProjection(timeframe);

    // Customer growth by timeframe
    const customersByTimeframe = await this.customerModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: timeframeProjection,
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.week': 1,
          '_id.quarter': 1,
        },
      },
    ]);

    // Format results
    const formattedCustomersByTimeframe = customersByTimeframe.map((item) => ({
      period: this.formatTimeframePeriod(timeframe, item._id),
      count: item.count,
    }));

    // Customer distribution by type
    const customersByType = await this.customerModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Format results
    const formattedCustomersByType = customersByType.map((item) => ({
      type: item._id,
      count: item.count,
    }));

    // Calculate total customers
    const totalCustomers = await this.customerModel.countDocuments({
      organization: organizationId,
      ...dateFilter,
    });

    // Customer to Deal conversion rate
    const customersWithDeals = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$customer',
          dealCount: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
      {
        $count: 'total',
      },
    ]);

    const customersWithDealsCount =
      customersWithDeals.length > 0 ? customersWithDeals[0].total : 0;
    const conversionRate =
      totalCustomers > 0 ? (customersWithDealsCount / totalCustomers) * 100 : 0;

    return {
      customersByTimeframe: formattedCustomersByTimeframe,
      customersByType: formattedCustomersByType,
      totalCustomers,
      customersWithDeals: customersWithDealsCount,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    };
  }

  async getActivityAnalytics(
    organizationId: string,
    queryParams: QueryAnalyticsDto,
  ) {
    const { timeframe = 'monthly', startDate, endDate, userId } = queryParams;

    // Prepare date range filter
    const dateQuery = this.getDateRangeQuery(startDate, endDate);
    const dateFilter =
      Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // Prepare user filter if provided
    const userFilter = userId ? { assignedTo: userId } : {};

    // Get timeframe projection
    const timeframeProjection = this.getTimeframeProjection(timeframe);

    // Tasks created by timeframe
    const tasksByTimeframe = await this.taskModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
          ...userFilter,
        },
      },
      {
        $group: {
          _id: timeframeProjection,
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.week': 1,
          '_id.quarter': 1,
        },
      },
    ]);

    // Format results
    const formattedTasksByTimeframe = tasksByTimeframe.map((item) => ({
      period: this.formatTimeframePeriod(timeframe, item._id),
      total: item.count,
      completed: item.completedCount,
      completion_rate:
        item.count > 0
          ? parseFloat(((item.completedCount / item.count) * 100).toFixed(2))
          : 0,
    }));

    // Task completion stats
    const taskCompletionStats = await this.taskModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
          ...userFilter,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format task completion stats
    const formattedTaskCompletionStats = taskCompletionStats.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    // Calculate completion rate
    const totalTasks = Object.values(formattedTaskCompletionStats).reduce(
      (sum: number, val: number) => sum + val,
      0,
    ) as number;
    const completedTasks = formattedTaskCompletionStats['completed'] || 0;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Task distribution by priority
    const tasksByPriority = await this.taskModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
          ...userFilter,
        },
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format task distribution by priority
    const formattedTasksByPriority = tasksByPriority.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      tasksByTimeframe: formattedTasksByTimeframe,
      taskCompletionStats: formattedTaskCompletionStats,
      completionRate: parseFloat(completionRate.toFixed(2)),
      tasksByPriority: formattedTasksByPriority,
      totalTasks,
    };
  }

  async getPerformanceAnalytics(
    organizationId: string,
    queryParams: QueryAnalyticsDto,
  ) {
    const { startDate, endDate } = queryParams;

    // Prepare date range filter
    const dateQuery = this.getDateRangeQuery(startDate, endDate);
    const dateFilter =
      Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // Get deals by assignedTo user
    const dealsByUser = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$assignedTo',
          userName: { $first: '$user.name' },
          totalDeals: { $sum: 1 },
          totalValue: { $sum: '$value' },
          wonDeals: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-won'] }, 1, 0],
            },
          },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-won'] }, '$value', 0],
            },
          },
        },
      },
      {
        $sort: { totalValue: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Format user performance data
    const userPerformance = dealsByUser.map((item) => ({
      userId: item._id,
      userName: item.userName,
      totalDeals: item.totalDeals,
      totalValue: item.totalValue,
      wonDeals: item.wonDeals,
      wonValue: item.wonValue,
      winRate:
        item.totalDeals > 0
          ? parseFloat(((item.wonDeals / item.totalDeals) * 100).toFixed(2))
          : 0,
    }));

    // Get tasks completion rate by user
    const tasksByUser = await this.taskModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$assignedTo',
          userName: { $first: '$user.name' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'completed'] },
                    { $ne: ['$status', 'cancelled'] },
                    { $lt: ['$dueDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { totalTasks: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Format task performance data
    const taskPerformance = tasksByUser.map((item) => ({
      userId: item._id,
      userName: item.userName,
      totalTasks: item.totalTasks,
      completedTasks: item.completedTasks,
      overdueTasks: item.overdueTasks,
      completionRate:
        item.totalTasks > 0
          ? parseFloat(
              ((item.completedTasks / item.totalTasks) * 100).toFixed(2),
            )
          : 0,
    }));

    // Get customers by creator/owner
    const customersByUser = await this.customerModel.aggregate([
      {
        $match: {
          organization: organizationId,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$assignedTo',
          userName: { $first: '$user.name' },
          totalCustomers: { $sum: 1 },
        },
      },
      {
        $sort: { totalCustomers: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Format customer performance data
    const customerPerformance = customersByUser.map((item) => ({
      userId: item._id,
      userName: item.userName,
      totalCustomers: item.totalCustomers,
    }));

    return {
      dealPerformance: userPerformance,
      taskPerformance: taskPerformance,
      customerPerformance: customerPerformance,
    };
  }

  async getDashboardStats(organizationId: string) {
    // Get current date and last month date
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get total customers
    const totalCustomers = await this.customerModel.countDocuments({
      organization: organizationId,
    });

    // Get new customers this month
    const newCustomersThisMonth = await this.customerModel.countDocuments({
      organization: organizationId,
      createdAt: { $gte: firstDayOfMonth },
    });

    // Get new customers last month
    const newCustomersLastMonth = await this.customerModel.countDocuments({
      organization: organizationId,
      createdAt: { $gte: lastMonth, $lt: firstDayOfMonth },
    });

    // Calculate customer growth percentage
    const customerGrowthRate =
      newCustomersLastMonth > 0
        ? ((newCustomersThisMonth - newCustomersLastMonth) /
            newCustomersLastMonth) *
          100
        : newCustomersThisMonth > 0
          ? 100
          : 0;

    // Get sales pipeline value
    const salesPipeline = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          stage: { $nin: ['closed-won', 'closed-lost'] },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
          dealCount: { $sum: 1 },
        },
      },
    ]);

    const pipelineValue =
      salesPipeline.length > 0 ? salesPipeline[0].totalValue : 0;
    const pipelineDealCount =
      salesPipeline.length > 0 ? salesPipeline[0].dealCount : 0;

    // Get revenue this month (closed-won deals)
    const revenueThisMonth = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          stage: 'closed-won',
          createdAt: { $gte: firstDayOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
          dealCount: { $sum: 1 },
        },
      },
    ]);

    const thisMonthRevenue =
      revenueThisMonth.length > 0 ? revenueThisMonth[0].totalValue : 0;
    const thisMonthWonDeals =
      revenueThisMonth.length > 0 ? revenueThisMonth[0].dealCount : 0;

    // Get revenue last month
    const revenueLastMonth = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          stage: 'closed-won',
          createdAt: { $gte: lastMonth, $lt: firstDayOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    const lastMonthRevenue =
      revenueLastMonth.length > 0 ? revenueLastMonth[0].totalValue : 0;

    // Calculate revenue growth percentage
    const revenueGrowthRate =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // Get tasks stats
    const tasksOverdue = await this.taskModel.countDocuments({
      organization: organizationId,
      status: { $in: ['todo', 'in_progress'] },
      dueDate: { $lt: now },
    });

    const tasksDueToday = await this.taskModel.countDocuments({
      organization: organizationId,
      status: { $in: ['todo', 'in_progress'] },
      dueDate: {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lt: new Date(now.setHours(23, 59, 59, 999)),
      },
    });

    // Get monthly trend data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrend = await this.dealModel.aggregate([
      {
        $match: {
          organization: organizationId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalValue: { $sum: '$value' },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-won'] }, '$value', 0],
            },
          },
          dealCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Format monthly trend data
    const formattedMonthlyTrend = monthlyTrend.map((item) => {
      const month = new Date(item._id.year, item._id.month - 1, 1);
      return {
        period: month.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }),
        totalValue: item.totalValue,
        wonValue: item.wonValue,
        dealCount: item.dealCount,
      };
    });

    return {
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
        growthRate: parseFloat(customerGrowthRate.toFixed(2)),
      },
      sales: {
        pipelineValue,
        pipelineDealCount,
        thisMonthRevenue,
        thisMonthWonDeals,
        growthRate: parseFloat(revenueGrowthRate.toFixed(2)),
      },
      tasks: {
        overdue: tasksOverdue,
        dueToday: tasksDueToday,
      },
      trend: formattedMonthlyTrend,
    };
  }
}
