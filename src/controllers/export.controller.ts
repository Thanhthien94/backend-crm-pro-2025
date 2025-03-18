import { Request, Response, NextFunction } from 'express';
import { Parser } from 'json2csv';
import Customer from '../models/Customer';
import Deal from '../models/Deal';
import Task from '../models/Task';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

interface PopulatedAssignee {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}

interface PopulatedCustomer {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  company?: string;
}

// @desc    Export customers to CSV
// @route   GET /api/v1/exports/customers
// @access  Private
export const exportCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;

    // Get customers
    const customers = await Customer.find(query).populate('assignedTo', 'name email');

    if (customers.length === 0) {
      return next(new AppError('No customers found to export', 404));
    }

    // Prepare data for CSV export - flatten nested objects
    const customersForExport = customers.map((customer) => {
      const flatCustomer: any = {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        status: customer.status,
        source: customer.source,
        assignedToName: customer.assignedTo
          ? (customer.assignedTo as unknown as PopulatedAssignee).name
          : '',
        assignedToEmail: customer.assignedTo
          ? (customer.assignedTo as unknown as PopulatedAssignee).email
          : '',
        notes: customer.notes,
        createdAt: customer.createdAt,
      };

      // Add custom fields
      if (customer.customFields) {
        Object.keys(customer.customFields).forEach((key) => {
          flatCustomer[`custom_${key}`] = customer.customFields![key];
        });
      }

      return flatCustomer;
    });

    // Define fields for CSV
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Phone', value: 'phone' },
      { label: 'Company', value: 'company' },
      { label: 'Type', value: 'type' },
      { label: 'Status', value: 'status' },
      { label: 'Source', value: 'source' },
      { label: 'Assigned To', value: 'assignedToName' },
      { label: 'Assigned Email', value: 'assignedToEmail' },
      { label: 'Notes', value: 'notes' },
      { label: 'Created At', value: 'createdAt' },
    ];

    // Add custom fields to fields list
    const allCustomFields = new Set<string>();
    customersForExport.forEach((customer) => {
      Object.keys(customer).forEach((key) => {
        if (key.startsWith('custom_')) {
          allCustomFields.add(key);
        }
      });
    });

    allCustomFields.forEach((field) => {
      fields.push({
        label: field.replace('custom_', '').toUpperCase(),
        value: field,
      });
    });

    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(customersForExport);

    // Set headers
    res.header('Content-Type', 'text/csv');
    res.attachment(`customers-export-${Date.now()}.csv`);

    // Send CSV
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export deals to CSV
// @route   GET /api/v1/exports/deals
// @access  Private
export const exportDeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.stage) query.stage = req.query.stage;
    if (req.query.status) query.status = req.query.status;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;

    // Get deals
    const deals = await Deal.find(query)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email');

    if (deals.length === 0) {
      return next(new AppError('No deals found to export', 404));
    }

    // Prepare data for CSV export
    const dealsForExport = deals.map((deal) => {
      const flatDeal: any = {
        id: deal._id,
        title: deal.title,
        customerName: deal.customer ? (deal.customer as unknown as PopulatedCustomer).name : '',
        customerEmail: deal.customer ? (deal.customer as unknown as PopulatedCustomer).email : '',
        customerCompany: deal.customer
          ? (deal.customer as unknown as PopulatedCustomer).company
          : '',
        value: deal.value,
        currency: deal.currency,
        stage: deal.stage,
        status: deal.status,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
        assignedToName: deal.assignedTo
          ? (deal.assignedTo as unknown as PopulatedAssignee).name
          : '',
        assignedToEmail: deal.assignedTo
          ? (deal.assignedTo as unknown as PopulatedAssignee).email
          : '',
        notes: deal.notes,
        productsJson: deal.products ? JSON.stringify(deal.products) : '',
        createdAt: deal.createdAt,
      };

      // Add custom fields
      if (deal.customFields) {
        Object.keys(deal.customFields).forEach((key) => {
          flatDeal[`custom_${key}`] = deal.customFields![key];
        });
      }

      return flatDeal;
    });

    // Define fields for CSV
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Title', value: 'title' },
      { label: 'Customer Name', value: 'customerName' },
      { label: 'Customer Email', value: 'customerEmail' },
      { label: 'Customer Company', value: 'customerCompany' },
      { label: 'Value', value: 'value' },
      { label: 'Currency', value: 'currency' },
      { label: 'Stage', value: 'stage' },
      { label: 'Status', value: 'status' },
      { label: 'Probability (%)', value: 'probability' },
      { label: 'Expected Close Date', value: 'expectedCloseDate' },
      { label: 'Assigned To', value: 'assignedToName' },
      { label: 'Assigned Email', value: 'assignedToEmail' },
      { label: 'Notes', value: 'notes' },
      { label: 'Products', value: 'productsJson' },
      { label: 'Created At', value: 'createdAt' },
    ];

    // Add custom fields to fields list
    const allCustomFields = new Set<string>();
    dealsForExport.forEach((deal) => {
      Object.keys(deal).forEach((key) => {
        if (key.startsWith('custom_')) {
          allCustomFields.add(key);
        }
      });
    });

    allCustomFields.forEach((field) => {
      fields.push({
        label: field.replace('custom_', '').toUpperCase(),
        value: field,
      });
    });

    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(dealsForExport);

    // Set headers
    res.header('Content-Type', 'text/csv');
    res.attachment(`deals-export-${Date.now()}.csv`);

    // Send CSV
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export tasks to CSV
// @route   GET /api/v1/exports/tasks
// @access  Private
export const exportTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;

    // Get tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');

    if (tasks.length === 0) {
      return next(new AppError('No tasks found to export', 404));
    }

    // Prepare data for CSV export
    const tasksForExport = tasks.map((task) => {
      const flatTask: any = {
        id: task._id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        assignedToName: task.assignedTo
          ? (task.assignedTo as unknown as PopulatedAssignee).name
          : '',
        assignedToEmail: task.assignedTo
          ? (task.assignedTo as unknown as PopulatedAssignee).email
          : '',
        relatedToModel: task.relatedTo ? task.relatedTo.model : '',
        relatedToId: task.relatedTo ? task.relatedTo.id : '',
        reminderDate: task.reminderDate,
        completedDate: task.completedDate,
        completedByName: task.completedBy
          ? (task.completedBy as unknown as PopulatedAssignee).name
          : '',
        createdByName: task.createdBy ? (task.createdBy as unknown as PopulatedAssignee).name : '',
        createdAt: task.createdAt,
      };

      // Add custom fields
      if ((task as any).customFields) {
        Object.keys((task as any).customFields).forEach((key) => {
          flatTask[`custom_${key}`] = (task as any).customFields[key];
        });
      }

      return flatTask;
    });

    // Define fields for CSV
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Title', value: 'title' },
      { label: 'Description', value: 'description' },
      { label: 'Due Date', value: 'dueDate' },
      { label: 'Priority', value: 'priority' },
      { label: 'Status', value: 'status' },
      { label: 'Assigned To', value: 'assignedToName' },
      { label: 'Assigned Email', value: 'assignedToEmail' },
      { label: 'Related To Model', value: 'relatedToModel' },
      { label: 'Related To ID', value: 'relatedToId' },
      { label: 'Reminder Date', value: 'reminderDate' },
      { label: 'Completed Date', value: 'completedDate' },
      { label: 'Completed By', value: 'completedByName' },
      { label: 'Created By', value: 'createdByName' },
      { label: 'Created At', value: 'createdAt' },
    ];

    // Add custom fields to fields list
    const allCustomFields = new Set<string>();
    tasksForExport.forEach((task) => {
      Object.keys(task).forEach((key) => {
        if (key.startsWith('custom_')) {
          allCustomFields.add(key);
        }
      });
    });

    allCustomFields.forEach((field) => {
      fields.push({
        label: field.replace('custom_', '').toUpperCase(),
        value: field,
      });
    });

    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(tasksForExport);

    // Set headers
    res.header('Content-Type', 'text/csv');
    res.attachment(`tasks-export-${Date.now()}.csv`);

    // Send CSV
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
