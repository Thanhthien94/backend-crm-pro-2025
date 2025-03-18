import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import Deal from '../models/Deal';
import Task from '../models/Task';

interface DealCountItem {
  count: number;
  value: number;
}

interface DealCounts {
  total: number;
  totalValue: number;
  lead: DealCountItem;
  qualified: DealCountItem;
  proposal: DealCountItem;
  negotiation: DealCountItem;
  'closed-won': DealCountItem;
  'closed-lost': DealCountItem;
  [key: string]: number | DealCountItem; // Index signature cho phép các key string bất kỳ
}

// Khởi tạo dealCounts
const dealCounts: DealCounts = {
  total: 0,
  totalValue: 0,
  lead: { count: 0, value: 0 },
  qualified: { count: 0, value: 0 },
  proposal: { count: 0, value: 0 },
  negotiation: { count: 0, value: 0 },
  'closed-won': { count: 0, value: 0 },
  'closed-lost': { count: 0, value: 0 },
};

// @desc    Get dashboard overview stats
// @route   GET /api/v1/analytics/dashboard
// @access  Private
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user.organization;

    // Get customer stats
    const customerStats = await Customer.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format customer stats
    const customerCounts = {
      total: 0,
      lead: 0,
      prospect: 0,
      customer: 0,
      churned: 0,
    };

    customerStats.forEach((stat) => {
      customerCounts[stat._id as keyof typeof customerCounts] = stat.count;
      customerCounts.total += stat.count;
    });

    // Get deal stats
    const dealStats = await Deal.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          value: { $sum: '$value' },
        },
      },
    ]);

    // Format deal stats
    const dealCounts = {
      total: 0,
      totalValue: 0,
      lead: { count: 0, value: 0 },
      qualified: { count: 0, value: 0 },
      proposal: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      'closed-won': { count: 0, value: 0 },
      'closed-lost': { count: 0, value: 0 },
    };

    dealStats.forEach((stat) => {
      // Bỏ qua việc kiểm tra kiểu trong trường hợp này
      (dealCounts as any)[stat._id] = {
        count: stat.count,
        value: stat.value,
      };

      dealCounts.total += stat.count;
      dealCounts.totalValue += stat.value;
    });

    // Get task stats
    const taskStats = await Task.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format task stats
    const taskCounts = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      canceled: 0,
    };

    taskStats.forEach((stat) => {
      customerCounts[stat._id as keyof typeof customerCounts] = stat.count;
      taskCounts.total += stat.count;
    });

    // Calculate overdue tasks
    const overdueTasks = await Task.countDocuments({
      organization: organizationId,
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'canceled'] },
    });

    // Calculate tasks due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueToday = await Task.countDocuments({
      organization: organizationId,
      dueDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['completed', 'canceled'] },
    });

    // Get sales pipeline forecast
    const salesForecast = await Deal.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organizationId),
          status: 'active',
          stage: { $nin: ['closed-won', 'closed-lost'] },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$value' },
          weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } },
        },
      },
    ]);

    const forecastValue =
      salesForecast.length > 0
        ? {
            totalValue: salesForecast[0].totalValue,
            weightedValue: salesForecast[0].weightedValue,
          }
        : { totalValue: 0, weightedValue: 0 };

    // Get recent activities (deals and customers created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCustomers = await Customer.countDocuments({
      organization: organizationId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentDeals = await Deal.countDocuments({
      organization: organizationId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentClosedDeals = await Deal.countDocuments({
      organization: organizationId,
      stage: 'closed-won',
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Return all stats
    res.status(200).json({
      success: true,
      data: {
        customers: customerCounts,
        deals: dealCounts,
        tasks: {
          ...taskCounts,
          overdue: overdueTasks,
          dueToday: tasksDueToday,
        },
        forecast: forecastValue,
        recentActivity: {
          newCustomers: recentCustomers,
          newDeals: recentDeals,
          closedDeals: recentClosedDeals,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales by time period
// @route   GET /api/v1/analytics/sales
// @access  Private
export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const organizationId = req.user.organization;

    let dateFormat, groupBy;

    // Set date format and grouping based on period
    if (period === 'day') {
      dateFormat = '%Y-%m-%d';
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    } else if (period === 'week') {
      dateFormat = '%Y-W%U';
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else if (period === 'quarter') {
      dateFormat = '%Y-Q%q';
      groupBy = {
        year: { $year: '$createdAt' },
        quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } },
      };
    } else if (period === 'year') {
      dateFormat = '%Y';
      groupBy = { year: { $year: '$createdAt' } };
    }

    // Define match criteria
    const matchCriteria: any = { organization: new mongoose.Types.ObjectId(organizationId) };

    // Add date range if provided
    if (startDate && endDate) {
      matchCriteria.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get deals by period
    const dealsReport = await Deal.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-won'] }, '$value', 0],
            },
          },
          lostValue: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-lost'] }, '$value', 0],
            },
          },
          wonCount: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-won'] }, 1, 0],
            },
          },
          lostCount: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-lost'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          period: {
            $switch: {
              branches: [
                {
                  case: { $eq: [period, 'day'] },
                  then: {
                    $dateToString: {
                      date: {
                        $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' },
                      },
                      format: dateFormat,
                    },
                  },
                },
                {
                  case: { $eq: [period, 'week'] },
                  then: { $concat: [{ $toString: '$_id.year' }, '-W', { $toString: '$_id.week' }] },
                },
                {
                  case: { $eq: [period, 'month'] },
                  then: {
                    $dateToString: {
                      date: { $dateFromParts: { year: '$_id.year', month: '$_id.month' } },
                      format: dateFormat,
                    },
                  },
                },
                {
                  case: { $eq: [period, 'quarter'] },
                  then: {
                    $concat: [{ $toString: '$_id.year' }, '-Q', { $toString: '$_id.quarter' }],
                  },
                },
              ],
              default: { $toString: '$_id.year' },
            },
          },
          count: 1,
          totalValue: 1,
          wonValue: 1,
          lostValue: 1,
          wonCount: 1,
          lostCount: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$count', 0] },
              0,
              { $multiply: [{ $divide: ['$wonCount', '$count'] }, 100] },
            ],
          },
        },
      },
      { $sort: { period: 1 } },
    ]);

    // Get customers by period
    const customersReport = await Customer.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          leads: {
            $sum: {
              $cond: [{ $eq: ['$type', 'lead'] }, 1, 0],
            },
          },
          prospects: {
            $sum: {
              $cond: [{ $eq: ['$type', 'prospect'] }, 1, 0],
            },
          },
          customers: {
            $sum: {
              $cond: [{ $eq: ['$type', 'customer'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          period: {
            $switch: {
              branches: [
                {
                  case: { $eq: [period, 'day'] },
                  then: {
                    $dateToString: {
                      date: {
                        $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' },
                      },
                      format: dateFormat,
                    },
                  },
                },
                {
                  case: { $eq: [period, 'week'] },
                  then: { $concat: [{ $toString: '$_id.year' }, '-W', { $toString: '$_id.week' }] },
                },
                {
                  case: { $eq: [period, 'month'] },
                  then: {
                    $dateToString: {
                      date: { $dateFromParts: { year: '$_id.year', month: '$_id.month' } },
                      format: dateFormat,
                    },
                  },
                },
                {
                  case: { $eq: [period, 'quarter'] },
                  then: {
                    $concat: [{ $toString: '$_id.year' }, '-Q', { $toString: '$_id.quarter' }],
                  },
                },
              ],
              default: { $toString: '$_id.year' },
            },
          },
          count: 1,
          leads: 1,
          prospects: 1,
          customers: 1,
        },
      },
      { $sort: { period: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        deals: dealsReport,
        customers: customersReport,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales by user
// @route   GET /api/v1/analytics/performance
// @access  Private/Admin
export const getPerformanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organization;

    // Define match criteria
    const matchCriteria: any = { organization: new mongoose.Types.ObjectId(organizationId) };

    // Add date range if provided
    if (startDate && endDate) {
      matchCriteria.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get performance by user
    const performanceReport = await Deal.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$assignedTo',
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
          lostDeals: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'closed-lost'] }, 1, 0],
            },
          },
          avgDealSize: { $avg: '$value' },
        },
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
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          totalDeals: 1,
          totalValue: 1,
          wonDeals: 1,
          wonValue: 1,
          lostDeals: 1,
          avgDealSize: 1,
          winRate: {
            $cond: [
              { $eq: ['$totalDeals', 0] },
              0,
              { $multiply: [{ $divide: ['$wonDeals', '$totalDeals'] }, 100] },
            ],
          },
        },
      },
      { $sort: { wonValue: -1 } },
    ]);

    // Get tasks completed by user
    const taskReport = await Task.aggregate([
      { $match: { ...matchCriteria, status: 'completed' } },
      {
        $group: {
          _id: '$assignedTo',
          totalTasks: { $sum: 1 },
        },
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
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          totalTasks: 1,
        },
      },
    ]);

    // Merge the two reports
    const mergedReport = performanceReport.map((dealStats) => {
      const taskStats = taskReport.find((t) => t.userId.toString() === dealStats.userId.toString());
      return {
        ...dealStats,
        completedTasks: taskStats ? taskStats.totalTasks : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: mergedReport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get deal pipeline
// @route   GET /api/v1/analytics/pipeline
// @access  Private
export const getPipelineReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user.organization;

    // Get deals by stage
    const pipelineReport = await Deal.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organizationId),
          status: 'active',
          stage: { $nin: ['closed-won', 'closed-lost'] },
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgValue: { $avg: '$value' },
          deals: {
            $push: { id: '$_id', title: '$title', value: '$value', probability: '$probability' },
          },
        },
      },
      {
        $project: {
          _id: 0,
          stage: '$_id',
          count: 1,
          totalValue: 1,
          avgValue: 1,
          deals: { $slice: ['$deals', 5] }, // Limit to 5 deals per stage for detailed view
        },
      },
      { $sort: { stage: 1 } },
    ]);

    // Get conversion rates between stages
    const stageConversions = await Deal.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organizationId),
        },
      },
      {
        $group: {
          _id: null,
          totalLeads: {
            $sum: { $cond: [{ $eq: ['$stage', 'lead'] }, 1, 0] },
          },
          totalQualified: {
            $sum: { $cond: [{ $eq: ['$stage', 'qualified'] }, 1, 0] },
          },
          totalProposal: {
            $sum: { $cond: [{ $eq: ['$stage', 'proposal'] }, 1, 0] },
          },
          totalNegotiation: {
            $sum: { $cond: [{ $eq: ['$stage', 'negotiation'] }, 1, 0] },
          },
          totalClosedWon: {
            $sum: { $cond: [{ $eq: ['$stage', 'closed-won'] }, 1, 0] },
          },
          totalClosedLost: {
            $sum: { $cond: [{ $eq: ['$stage', 'closed-lost'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          leadToQualified: {
            $cond: [
              { $eq: ['$totalLeads', 0] },
              0,
              { $multiply: [{ $divide: ['$totalQualified', '$totalLeads'] }, 100] },
            ],
          },
          qualifiedToProposal: {
            $cond: [
              { $eq: ['$totalQualified', 0] },
              0,
              { $multiply: [{ $divide: ['$totalProposal', '$totalQualified'] }, 100] },
            ],
          },
          proposalToNegotiation: {
            $cond: [
              { $eq: ['$totalProposal', 0] },
              0,
              { $multiply: [{ $divide: ['$totalNegotiation', '$totalProposal'] }, 100] },
            ],
          },
          negotiationToClosedWon: {
            $cond: [
              { $eq: ['$totalNegotiation', 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: ['$totalClosedWon', { $add: ['$totalClosedWon', '$totalClosedLost'] }],
                  },
                  100,
                ],
              },
            ],
          },
          overallConversion: {
            $cond: [
              { $eq: [{ $add: ['$totalLeads', '$totalQualified'] }, 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$totalClosedWon', { $add: ['$totalLeads', '$totalQualified'] }] },
                  100,
                ],
              },
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        pipeline: pipelineReport,
        conversions:
          stageConversions.length > 0
            ? stageConversions[0]
            : {
                leadToQualified: 0,
                qualifiedToProposal: 0,
                proposalToNegotiation: 0,
                negotiationToClosedWon: 0,
                overallConversion: 0,
              },
      },
    });
  } catch (error) {
    next(error);
  }
};
