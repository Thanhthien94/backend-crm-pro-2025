import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import {
  Customer,
  CustomerDocument,
} from '../customers/schemas/customer.schema';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { ImportEntity } from './dto/import-file.dto';
import { UsersService } from '../users/users.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { EntityType } from '../custom-fields/schemas/custom-field.schema';

@Injectable()
export class ImportService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private usersService: UsersService,
    private customFieldsService: CustomFieldsService,
  ) {}

  async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  async importData(
    entity: ImportEntity,
    data: any[],
    organizationId: string,
    userId: string,
  ): Promise<{ success: number; errors: number; messages: string[] }> {
    if (!data || data.length === 0) {
      throw new BadRequestException('No data to import');
    }

    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];

    switch (entity) {
      case ImportEntity.CUSTOMERS:
        return this.importCustomers(data, organizationId, userId);

      case ImportEntity.DEALS:
        return this.importDeals(data, organizationId, userId);

      case ImportEntity.TASKS:
        return this.importTasks(data, organizationId, userId);

      default:
        throw new BadRequestException(`Unsupported entity: ${entity}`);
    }
  }

  async validateRequiredFields(
    data: any,
    requiredFields: string[],
  ): Promise<string[]> {
    const missingFields = requiredFields.filter(
      (field) => !data[field] || data[field].trim() === '',
    );

    return missingFields;
  }

  private async importCustomers(
    data: any[],
    organizationId: string,
    userId: string,
  ): Promise<{ success: number; errors: number; messages: string[] }> {
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];
    const requiredFields = ['name', 'email'];

    // Validate custom fields
    const customFieldsMap = await this.getCustomFieldsMap(
      EntityType.CUSTOMER,
      organizationId,
    );

    for (const [index, row] of data.entries()) {
      try {
        // Validate required fields
        const missingFields = await this.validateRequiredFields(
          row,
          requiredFields,
        );
        if (missingFields.length > 0) {
          errorCount++;
          messages.push(
            `Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`,
          );
          continue;
        }

        // Extract standard fields and custom fields
        const { customFields, ...standardFields } = this.extractFields(
          row,
          customFieldsMap,
        );

        // Check if customer already exists by email
        const existingCustomer = await this.customerModel.findOne({
          organization: organizationId,
          email: row.email,
        });

        if (existingCustomer) {
          // Update existing customer
          await this.customerModel.updateOne(
            { _id: existingCustomer._id },
            {
              ...standardFields,
              customFields: {
                ...existingCustomer.customFields,
                ...customFields,
              },
            },
          );
          successCount++;
          messages.push(
            `Row ${index + 1}: Updated existing customer: ${row.name}`,
          );
        } else {
          // Create new customer
          const assignedToId = row.assignedTo || userId;

          // Create the customer
          await this.customerModel.create({
            ...standardFields,
            organization: organizationId,
            assignedTo: assignedToId,
            customFields,
          });

          successCount++;
          messages.push(`Row ${index + 1}: Created new customer: ${row.name}`);
        }
      } catch (error) {
        errorCount++;
        messages.push(`Row ${index + 1}: Error - ${error.message}`);
      }
    }

    return { success: successCount, errors: errorCount, messages };
  }

  private async importDeals(
    data: any[],
    organizationId: string,
    userId: string,
  ): Promise<{ success: number; errors: number; messages: string[] }> {
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];
    const requiredFields = ['name', 'value', 'customerId'];

    // Validate custom fields
    const customFieldsMap = await this.getCustomFieldsMap(
      EntityType.DEAL,
      organizationId,
    );

    for (const [index, row] of data.entries()) {
      try {
        // Validate required fields
        const missingFields = await this.validateRequiredFields(
          row,
          requiredFields,
        );
        if (missingFields.length > 0) {
          errorCount++;
          messages.push(
            `Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`,
          );
          continue;
        }

        // Extract standard fields and custom fields
        const { customFields, ...standardFields } = this.extractFields(
          row,
          customFieldsMap,
        );

        // Check if customer exists
        const customer = await this.customerModel.findOne({
          $or: [{ _id: row.customerId }, { email: row.customerEmail }],
          organization: organizationId,
        });

        if (!customer) {
          errorCount++;
          messages.push(
            `Row ${index + 1}: Customer not found for deal: ${row.name}`,
          );
          continue;
        }

        // Prepare deal data
        const dealData = {
          ...standardFields,
          value: parseFloat(row.value),
          organization: organizationId,
          customer: customer._id,
          assignedTo: row.assignedTo || userId,
          customFields,
        };

        // Create the deal
        await this.dealModel.create(dealData);

        successCount++;
        messages.push(`Row ${index + 1}: Created new deal: ${row.name}`);
      } catch (error) {
        errorCount++;
        messages.push(`Row ${index + 1}: Error - ${error.message}`);
      }
    }

    return { success: successCount, errors: errorCount, messages };
  }

  private async importTasks(
    data: any[],
    organizationId: string,
    userId: string,
  ): Promise<{ success: number; errors: number; messages: string[] }> {
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];
    const requiredFields = ['title', 'dueDate'];

    for (const [index, row] of data.entries()) {
      try {
        // Validate required fields
        const missingFields = await this.validateRequiredFields(
          row,
          requiredFields,
        );
        if (missingFields.length > 0) {
          errorCount++;
          messages.push(
            `Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`,
          );
          continue;
        }

        // Prepare task data
        const taskData: any = {
          title: row.title,
          description: row.description,
          status: row.status || 'todo',
          priority: row.priority || 'medium',
          dueDate: new Date(row.dueDate),
          organization: organizationId,
          createdBy: userId,
          assignedTo: row.assignedTo || userId,
        };

        // Handle customer reference if provided
        if (row.customerId || row.customerEmail) {
          const customer = await this.customerModel.findOne({
            $or: [{ _id: row.customerId }, { email: row.customerEmail }],
            organization: organizationId,
          });

          if (customer) {
            taskData.customer = customer._id;
          }
        }

        // Handle deal reference if provided
        if (row.dealId || row.dealName) {
          const deal = await this.dealModel.findOne({
            $or: [{ _id: row.dealId }, { name: row.dealName }],
            organization: organizationId,
          });

          if (deal) {
            taskData.deal = deal._id;
          }
        }

        // Create the task
        await this.taskModel.create(taskData);

        successCount++;
        messages.push(`Row ${index + 1}: Created new task: ${row.title}`);
      } catch (error) {
        errorCount++;
        messages.push(`Row ${index + 1}: Error - ${error.message}`);
      }
    }

    return { success: successCount, errors: errorCount, messages };
  }

  private async getCustomFieldsMap(
    entityType: EntityType,
    organizationId: string,
  ): Promise<Record<string, string>> {
    const customFields = await this.customFieldsService.getFieldsByEntity(
      entityType,
      organizationId,
    );

    // Create a map of custom field keys to their names
    const customFieldsMap: Record<string, string> = {};
    customFields.forEach((field) => {
      customFieldsMap[field.name.toLowerCase()] = field.key;
    });

    return customFieldsMap;
  }

  private extractFields(
    row: any,
    customFieldsMap: Record<string, string>,
  ): { customFields: Record<string, any>; [key: string]: any } {
    const standardFields: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    Object.entries(row).forEach(([key, value]) => {
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Check if this is a custom field
      const customFieldKey = customFieldsMap[key.toLowerCase()];
      if (customFieldKey) {
        customFields[customFieldKey] = value;
        return;
      }

      // Handle standard fields
      standardFields[key] = value;
    });

    return { ...standardFields, customFields };
  }
}
