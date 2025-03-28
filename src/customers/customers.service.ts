import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';
import { WebhookService } from '../webhook/webhook.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private webhookService: WebhookService,
  ) {}

  async findAll(
    organizationId: string,
    filters: { type?: string; status?: string; search?: string } = {},
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
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

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

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        organization: organizationId,
      })
      .populate('assignedTo', 'name email');

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    organizationId: string,
    userId: string,
  ): Promise<CustomerDocument> {
    const customer = new this.customerModel({
      ...createCustomerDto,
      organization: organizationId,
      assignedTo: createCustomerDto.assignedTo || userId,
    });

    const savedCustomer = await customer.save();

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

      // We need to implement the webhook functionality later
      console.log(
        'Webhook triggered:',
        WebhookEvent.CUSTOMER_CREATED,
        customerObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return savedCustomer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    organizationId: string,
  ): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateCustomerDto,
        { new: true, runValidators: true },
      )
      .populate('assignedTo', 'name email');

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
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

      // We need to implement the webhook functionality later
      console.log(
        'Webhook triggered:',
        WebhookEvent.CUSTOMER_UPDATED,
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
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await customer.deleteOne();

    // Trigger webhook
    try {
      // We need to implement the webhook functionality later
      console.log('Webhook triggered:', WebhookEvent.CUSTOMER_DELETED, { id });
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return true;
  }
}
