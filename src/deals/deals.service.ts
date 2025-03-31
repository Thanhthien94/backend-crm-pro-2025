import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deal, DealDocument } from './schemas/deal.schema';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';
import { TasksService } from '../tasks/tasks.service';
import { RelatedEntityType } from '../common/enums/related-entity-type.enum';

interface DealWithRelatedTasks extends DealDocument {
  relatedTasks?: any[];
}
@Injectable()
export class DealsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    private webhookService: WebhookService,
    private tasksService: TasksService,
  ) {}

  async findAll(
    organizationId: string,
    filters: {
      stage?: string;
      status?: string;
      search?: string;
      customerId?: string;
    } = {},
    page = 1,
    limit = 10,
  ): Promise<{
    deals: DealDocument[]; // Updated type to DealDocument[]
    total: number;
  }> {
    type QueryType = {
      organization: string;
      stage?: string;
      status?: string;
      customer?: string;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.stage) query.stage = filters.stage;
    if (filters.status) query.status = filters.status;
    if (filters.customerId) query.customer = filters.customerId;

    // Handle search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await this.dealModel.countDocuments(query);

    const deals = await this.dealModel
      .find(query)
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email company')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Lấy tasks liên quan cho từng deal
    for (const deal of deals) {
      try {
        const relatedTasks = await this.tasksService.findByRelation(
          organizationId,
          RelatedEntityType.DEAL,
          deal._id.toString(),
        );
        // Thêm trường relatedTasks vào deal object
        (deal as DealWithRelatedTasks).relatedTasks = relatedTasks;
      } catch (error) {
        console.error(
          `Error fetching related tasks for deal ${deal._id}:`,
          error,
        );
        (deal as DealWithRelatedTasks).relatedTasks = [];
      }
    }

    return { deals, total };
  }

  async findById(id: string, organizationId: string): Promise<DealDocument> {
    const deal = await this.dealModel
      .findOne({
        _id: id,
        organization: organizationId,
      })
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email company')
      .lean();

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    try {
      // Lấy tasks liên quan
      const relatedTasks = await this.tasksService.findByRelation(
        organizationId,
        RelatedEntityType.DEAL,
        id,
      );
      console.log('task related: ', relatedTasks);
      // Thêm trường relatedTasks vào deal object
      (deal as DealWithRelatedTasks).relatedTasks = relatedTasks;
    } catch (error) {
      console.error(`Error fetching related tasks for deal ${id}:`, error);
      (deal as DealWithRelatedTasks).relatedTasks = [];
    }

    return deal;
  }

  async create(
    createDealDto: CreateDealDto,
    organizationId: string,
    userId: string,
  ): Promise<DealDocument> {
    const deal = new this.dealModel({
      ...createDealDto,
      organization: organizationId,
      assignedTo: createDealDto.assignedTo || userId,
    });

    const savedDeal = await deal.save();

    // Trigger webhook
    try {
      // Convert to plain object
      const dealObj = {
        id: savedDeal._id ? savedDeal._id.toString() : '',
        name: savedDeal.name,
        value: savedDeal.value,
        stage: savedDeal.stage,
        customerId: savedDeal.customer ? savedDeal.customer.toString() : '',
        organization: organizationId,
      };

      // Trigger webhook event
      await this.webhookService.triggerWebhook(
        WebhookEvent.DEAL_CREATED,
        organizationId,
        dealObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return savedDeal;
  }

  async update(
    id: string,
    updateDealDto: UpdateDealDto,
    organizationId: string,
  ): Promise<DealDocument> {
    const oldDeal = await this.findById(id, organizationId);
    const oldStage = oldDeal.stage;

    const deal = await this.dealModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateDealDto,
        { new: true, runValidators: true },
      )
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email company');

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Trigger webhook for update
    try {
      // Convert to plain object
      const dealObj = {
        id: deal._id ? deal._id.toString() : '',
        name: deal.name,
        value: deal.value,
        stage: deal.stage,
        customerId: deal.customer ? deal.customer.toString() : '',
        organization: organizationId,
      };

      // Trigger webhook event for deal update
      await this.webhookService.triggerWebhook(
        WebhookEvent.DEAL_UPDATED,
        organizationId,
        dealObj,
      );

      // If stage changed, trigger additional webhook event
      if (oldStage !== deal.stage) {
        await this.webhookService.triggerWebhook(
          WebhookEvent.DEAL_STAGE_CHANGED,
          organizationId,
          {
            ...dealObj,
            oldStage,
            newStage: deal.stage,
          },
        );
      }
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return deal;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const deal = await this.dealModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    await deal.deleteOne();

    // Trigger webhook
    try {
      // Trigger webhook event for deal deletion
      await this.webhookService.triggerWebhook(
        WebhookEvent.DEAL_DELETED,
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

  async getDealsSummary(organizationId: string): Promise<{
    totalValue: number;
    byStageCounts: Record<string, number>;
    byStageValues: Record<string, number>;
  }> {
    const pipeline = [
      {
        $match: {
          organization: organizationId,
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ];

    const results = await this.dealModel.aggregate(pipeline);

    // Format the results
    const byStageCounts: Record<string, number> = {};
    const byStageValues: Record<string, number> = {};
    let totalValue = 0;

    results.forEach((result) => {
      byStageCounts[result._id] = result.count;
      byStageValues[result._id] = result.totalValue;

      // Only sum active deals not in closed-lost
      if (result._id !== 'closed-lost') {
        totalValue += result.totalValue;
      }
    });

    return {
      totalValue,
      byStageCounts,
      byStageValues,
    };
  }
}
