import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { EntityType } from '../custom-fields/schemas/custom-field.schema';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';

interface CustomerWithRelatedData extends CustomerDocument {
  relatedDeals?: DealDocument[];
  relatedTasks?: TaskDocument[];
}
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private webhookService: WebhookService,
    private customFieldsService: CustomFieldsService,
  ) {}

  async findAll(
    organizationId: string,
    filters: {
      type?: string;
      status?: string;
      search?: string;
      assignedTo?: string;
    } = {},
    page = 1,
    limit = 10,
  ): Promise<{
    customers: CustomerDocument[];
    total: number;
  }> {
    type QueryType = {
      organization: string;
      type?: string;
      status?: string;
      assignedTo?: string;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    // Handle search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await this.customerModel.countDocuments(query);

    const customers = await this.customerModel
      .find(query)
      .populate('assignedTo', 'name email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    return { customers, total };
  }

  /**
   * Lấy danh sách deals liên quan đến một customer
   */
  async getRelatedDeals(
    customerId: string,
    organizationId: string,
  ): Promise<DealDocument[]> {
    return await this.dealModel
      .find({
        organization: organizationId,
        customer: customerId,
      })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Lấy danh sách tasks liên quan đến một customer
   */
  async getRelatedTasks(
    customerId: string,
    organizationId: string,
  ): Promise<TaskDocument[]> {
    return await this.taskModel
      .find({
        organization: organizationId,
        customer: customerId,
      })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 })
      .lean()
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        organization: organizationId,
      })
      .populate('assignedTo', 'name email')
      .lean();

    if (!customer) {
      throw new NotFoundException(`Khách hàng với ID ${id} không tìm thấy`);
    }

    try {
      // Lấy deals liên quan
      const relatedDeals = await this.getRelatedDeals(id, organizationId);

      // Lấy tasks liên quan
      const relatedTasks = await this.getRelatedTasks(id, organizationId);

      // Thêm vào kết quả trả về (type casting để bổ sung trường mới)
      (customer as CustomerWithRelatedData).relatedDeals = relatedDeals;
      (customer as CustomerWithRelatedData).relatedTasks = relatedTasks;
    } catch (error) {
      console.error(`Error fetching related data for customer ${id}:`, error);
      // Gán mảng rỗng nếu có lỗi
      (customer as CustomerWithRelatedData).relatedDeals = [];
      (customer as CustomerWithRelatedData).relatedTasks = [];
    }

    return customer;
  }

  async findByEmail(
    email: string,
    organizationId: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel
      .findOne({
        email,
        organization: organizationId,
      })
      .populate('assignedTo', 'name email');
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    organizationId: string,
    userId: string,
  ): Promise<CustomerDocument> {
    // Validate custom fields if any
    if (createCustomerDto.customFields) {
      const validationResult =
        await this.customFieldsService.validateCustomFields(
          EntityType.CUSTOMER,
          organizationId,
          createCustomerDto.customFields,
        );

      if (!validationResult.valid) {
        throw new BadRequestException({
          message: 'Dữ liệu trường tùy chỉnh không hợp lệ',
          errors: validationResult.errors,
        });
      }
    }

    // Check if customer with same email already exists
    const existingCustomer = await this.findByEmail(
      createCustomerDto.email,
      organizationId,
    );

    if (existingCustomer) {
      throw new BadRequestException(
        `Khách hàng với email ${createCustomerDto.email} đã tồn tại`,
      );
    }

    const customer = new this.customerModel({
      ...createCustomerDto,
      organization: organizationId,
      assignedTo: createCustomerDto.assignedTo || userId,
    });

    const savedCustomer = await customer.save();
    const populatedCustomer = await this.customerModel
      .findById(savedCustomer._id)
      .populate('assignedTo', 'name email');

    if (!populatedCustomer) {
      throw new NotFoundException(
        `Khách hàng với ID ${savedCustomer._id} không tìm thấy sau khi tạo`,
      );
    }

    // Trigger webhook
    try {
      // Convert to plain object
      const customerObj = {
        id: savedCustomer._id ? savedCustomer._id.toString() : '',
        name: savedCustomer.name,
        email: savedCustomer.email,
        type: savedCustomer.type,
        status: savedCustomer.status,
        organization: organizationId,
      };

      // Trigger webhook
      await this.webhookService.triggerWebhook(
        WebhookEvent.CUSTOMER_CREATED,
        organizationId,
        customerObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return populatedCustomer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    organizationId: string,
  ): Promise<CustomerDocument> {
    // Validate custom fields if any
    if (updateCustomerDto.customFields) {
      const validationResult =
        await this.customFieldsService.validateCustomFields(
          EntityType.CUSTOMER,
          organizationId,
          updateCustomerDto.customFields,
        );

      if (!validationResult.valid) {
        throw new BadRequestException({
          message: 'Dữ liệu trường tùy chỉnh không hợp lệ',
          errors: validationResult.errors,
        });
      }
    }

    // Check if updating email and it already exists for another customer
    if (updateCustomerDto.email) {
      const existingCustomer = await this.findByEmail(
        updateCustomerDto.email,
        organizationId,
      );

      if (existingCustomer && existingCustomer._id.toString() !== id) {
        throw new BadRequestException(
          `Khách hàng với email ${updateCustomerDto.email} đã tồn tại`,
        );
      }
    }

    // If we have customFields, we need to merge them with existing ones
    if (updateCustomerDto.customFields) {
      const customer = await this.findById(id, organizationId);

      updateCustomerDto.customFields = {
        ...customer.customFields,
        ...updateCustomerDto.customFields,
      };
    }

    const customer = await this.customerModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateCustomerDto,
        { new: true, runValidators: true },
      )
      .populate('assignedTo', 'name email');

    if (!customer) {
      throw new NotFoundException(`Khách hàng với ID ${id} không tìm thấy`);
    }

    // Trigger webhook
    try {
      // Convert to plain object
      const customerObj = {
        id: customer._id ? customer._id.toString() : '',
        name: customer.name,
        email: customer.email,
        type: customer.type,
        status: customer.status,
        organization: organizationId,
      };

      // Trigger webhook
      await this.webhookService.triggerWebhook(
        WebhookEvent.CUSTOMER_UPDATED,
        organizationId,
        customerObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return customer;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const customer = await this.customerModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!customer) {
      throw new NotFoundException(`Khách hàng với ID ${id} không tìm thấy`);
    }

    await customer.deleteOne();

    // Trigger webhook
    try {
      // Trigger webhook event
      await this.webhookService.triggerWebhook(
        WebhookEvent.CUSTOMER_DELETED,
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

  async bulkDelete(
    ids: string[],
    organizationId: string,
  ): Promise<{ deletedCount: number }> {
    // Validate that all IDs are valid and belong to the organization
    const customers = await this.customerModel.find({
      _id: { $in: ids },
      organization: organizationId,
    });

    if (customers.length !== ids.length) {
      throw new BadRequestException(
        'Một số khách hàng không tồn tại hoặc không thuộc tổ chức này',
      );
    }

    const result = await this.customerModel.deleteMany({
      _id: { $in: ids },
      organization: organizationId,
    });

    // Trigger webhooks for each deleted customer
    for (const id of ids) {
      try {
        await this.webhookService.triggerWebhook(
          WebhookEvent.CUSTOMER_DELETED,
          organizationId,
          { id },
        );
      } catch (error) {
        console.error(
          `Failed to trigger webhook for customer ${id}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return { deletedCount: result.deletedCount };
  }

  async getStatsByType(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const pipeline: PipelineStage[] = [
      {
        $match: { organization: organizationId },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.customerModel.aggregate(pipeline);

    const stats: Record<string, number> = {
      lead: 0,
      prospect: 0,
      customer: 0,
      churned: 0,
    };

    results.forEach((result) => {
      stats[result._id] = result.count;
    });

    return stats;
  }

  async getRecentlyCreated(
    organizationId: string,
    limit: number,
  ): Promise<CustomerDocument[]> {
    return this.customerModel
      .find({ organization: organizationId })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async validateImportData(
    data: any[],
    organizationId: string,
  ): Promise<{
    valid: boolean;
    errors: Record<number, string[]>;
  }> {
    const errors: Record<number, string[]> = {};
    let valid = true;

    // Get all custom fields for customers
    const customFields = await this.customFieldsService.getFieldsByEntity(
      EntityType.CUSTOMER,
      organizationId,
    );

    // Create a map of custom field names to keys
    const customFieldsMap = customFields.reduce(
      (map, field) => {
        map[field.name.toLowerCase()] = field.key;
        return map;
      },
      {} as Record<string, string>,
    );

    // Validate each row
    for (const [index, row] of data.entries()) {
      const rowErrors: string[] = [];

      // Validate required fields
      if (!row.name) {
        rowErrors.push('Tên khách hàng là bắt buộc');
      }

      if (!row.email) {
        rowErrors.push('Email là bắt buộc');
      } else {
        // Check if email is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          rowErrors.push('Email không hợp lệ');
        } else {
          // Check if email already exists
          const existingCustomer = await this.findByEmail(
            row.email,
            organizationId,
          );
          if (existingCustomer) {
            rowErrors.push(`Email đã tồn tại: ${row.email}`);
          }
        }
      }

      // Validate custom fields
      const customFieldsData: Record<string, any> = {};

      for (const [key, value] of Object.entries(row)) {
        const customFieldKey = customFieldsMap[key.toLowerCase()];
        if (customFieldKey) {
          customFieldsData[customFieldKey] = value;
        }
      }

      if (Object.keys(customFieldsData).length > 0) {
        // Validate custom fields
        const validationResult =
          await this.customFieldsService.validateCustomFields(
            EntityType.CUSTOMER,
            organizationId,
            customFieldsData,
          );

        if (!validationResult.valid && validationResult.errors) {
          for (const [field, error] of Object.entries(
            validationResult.errors,
          )) {
            rowErrors.push(`${field}: ${error}`);
          }
        }
      }

      // If row has errors, add to errors object
      if (rowErrors.length > 0) {
        errors[index] = rowErrors;
        valid = false;
      }
    }

    return { valid, errors };
  }

  async countByAssignedUser(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.customerModel.countDocuments({
      organization: organizationId,
      assignedTo: userId,
    });
  }

  async getCustomerGrowth(
    organizationId: string,
    period: 'week' | 'month' | 'quarter' = 'month',
    count: number = 6,
  ): Promise<{ period: string; count: number }[]> {
    const now = new Date();
    let dateFormat: { $dateToString: { format: string; date: string } };
    let subtractFn: (date: Date, index: number) => Date;

    switch (period) {
      case 'week':
        dateFormat = {
          $dateToString: { format: '%Y-W%U', date: '$createdAt' },
        };
        subtractFn = (date, index) => {
          const newDate = new Date(date);
          newDate.setDate(date.getDate() - 7 * index);
          return newDate;
        };
        break;
      case 'quarter':
        dateFormat = {
          $dateToString: {
            format: '%Y-Q%q',
            date: '$createdAt',
          },
        };
        subtractFn = (date, index) => {
          const newDate = new Date(date);
          newDate.setMonth(date.getMonth() - 3 * index);
          return newDate;
        };
        break;
      case 'month':
      default:
        dateFormat = {
          $dateToString: { format: '%Y-%m', date: '$createdAt' },
        };
        subtractFn = (date, index) => {
          const newDate = new Date(date);
          newDate.setMonth(date.getMonth() - index);
          return newDate;
        };
        break;
    }

    // Generate periods for filtering
    const periods: { start: Date; end: Date; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const end = i === 0 ? now : periods[i - 1].start;
      const start = subtractFn(end, 1);

      let label: string;
      switch (period) {
        case 'week':
          const weekNum = Math.ceil((start.getDate() - start.getDay()) / 7) + 1;
          label = `${start.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(start.getMonth() / 3) + 1;
          label = `${start.getFullYear()}-Q${quarter}`;
          break;
        case 'month':
        default:
          label = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
      }

      periods.push({ start, end, label });
    }

    // Query for each period
    const results = await Promise.all(
      periods.map(async (p) => {
        const count = await this.customerModel.countDocuments({
          organization: organizationId,
          createdAt: { $gte: p.start, $lt: p.end },
        });
        return { period: p.label, count };
      }),
    );

    // Reverse to get chronological order
    return results.reverse();
  }

  async updateCustomField(
    organizationId: string,
    fieldKey: string,
    oldValue: any,
    newValue: any,
  ): Promise<number> {
    const result = await this.customerModel.updateMany(
      {
        organization: organizationId,
        [`customFields.${fieldKey}`]: oldValue,
      },
      {
        $set: { [`customFields.${fieldKey}`]: newValue },
      },
    );

    return result.modifiedCount;
  }
}
