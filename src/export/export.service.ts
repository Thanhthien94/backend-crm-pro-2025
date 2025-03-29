import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Customer,
  CustomerDocument,
} from '../customers/schemas/customer.schema';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export enum ExportEntity {
  CUSTOMERS = 'customers',
  DEALS = 'deals',
  TASKS = 'tasks',
}

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async exportData(
    entity: ExportEntity,
    format: ExportFormat,
    organizationId: string,
    filters: Record<string, any> = {},
  ): Promise<{ data: any; filename: string }> {
    // Base query with organization filter
    const baseQuery = { organization: organizationId, ...filters };

    // Get data based on entity type
    let data: any[];
    let filename: string;

    switch (entity) {
      case ExportEntity.CUSTOMERS:
        data = await this.customerModel
          .find(baseQuery)
          .populate('assignedTo', 'name email')
          .lean();
        filename = `customers_export_${Date.now()}`;
        break;

      case ExportEntity.DEALS:
        data = await this.dealModel
          .find(baseQuery)
          .populate('assignedTo', 'name email')
          .populate('customer', 'name email company')
          .lean();
        filename = `deals_export_${Date.now()}`;
        break;

      case ExportEntity.TASKS:
        data = await this.taskModel
          .find(baseQuery)
          .populate('assignedTo', 'name email')
          .populate('createdBy', 'name email')
          .populate('customer', 'name email company')
          .populate('deal', 'name value stage')
          .lean();
        filename = `tasks_export_${Date.now()}`;
        break;

      default:
        throw new Error(`Unsupported entity: ${entity}`);
    }

    // Process data - Transform nested objects and ID references
    const processedData = this.processDataForExport(data);

    // Format data based on requested format
    let formattedData;

    switch (format) {
      case ExportFormat.CSV:
        formattedData = this.formatToCsv(processedData);
        filename = `${filename}.csv`;
        break;

      case ExportFormat.JSON:
        formattedData = JSON.stringify(processedData, null, 2);
        filename = `${filename}.json`;
        break;

      case ExportFormat.EXCEL:
        // For Excel, we'll return the processed data as is
        // The actual conversion to Excel format would happen in the controller
        formattedData = processedData;
        filename = `${filename}.xlsx`;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { data: formattedData, filename };
  }

  private processDataForExport(data: any[]): any[] {
    return data.map((item) => {
      const processed: Record<string, any> = {};

      // Process each field
      Object.entries(item).forEach(([key, value]) => {
        // Skip internal MongoDB fields
        if (key.startsWith('_') && key !== '_id') {
          return;
        }

        // Handle IDs
        if (key === '_id') {
          processed.id = value;
          return;
        }

        // Handle dates
        if (value instanceof Date) {
          processed[key] = value.toISOString();
          return;
        }

        // Handle nested objects (like populated fields)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // If it has a _id field, it's likely a populated document
          if ('_id' in value) {
            // For populated fields, extract key information
            if (key === 'assignedTo' || key === 'createdBy') {
              processed[`${key}Id`] = value._id;
              processed[`${key}Name`] = (value as any).name;
              processed[`${key}Email`] = (value as any).email;
              return;
            }

            if (key === 'customer') {
              processed[`${key}Id`] = value._id;
              processed[`${key}Name`] = (value as any).name;
              processed[`${key}Email`] = (value as any).email;
              processed[`${key}Company`] = (value as any).company;
              return;
            }

            if (key === 'deal') {
              processed[`${key}Id`] = value._id;
              processed[`${key}Name`] = (value as any).name;
              processed[`${key}Value`] = (value as any).value;
              processed[`${key}Stage`] = (value as any).stage;
              return;
            }
          }

          // For custom fields or other objects
          processed[key] = JSON.stringify(value);
          return;
        }

        // Handle arrays
        if (Array.isArray(value)) {
          processed[key] = JSON.stringify(value);
          return;
        }

        // Default case: use the value as is
        processed[key] = value;
      });

      return processed;
    });
  }

  private formatToCsv(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV header row
    let csv = headers.join(',') + '\n';

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => {
        const value = item[header];

        // Handle values that need to be quoted (contains commas or newlines)
        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);

        if (
          stringValue.includes(',') ||
          stringValue.includes('\n') ||
          stringValue.includes('"')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csv += row.join(',') + '\n';
    });

    return csv;
  }
}
