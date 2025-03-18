import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Customer from '../models/Customer';
import { AppError } from '../middleware/errorHandler';
import { triggerWebhooks, WebhookEvent } from '../services/webhook.service';

// @desc    Get all customers for organization
// @route   GET /api/v1/customers
// @access  Private
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const totalCustomers = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .populate('assignedTo', 'name email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: {
        total: totalCustomers,
        page,
        pages: Math.ceil(totalCustomers / limit),
      },
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private
export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    }).populate('assignedTo', 'name email');

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/v1/customers
// @access  Private
export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Add organization and user info
    req.body.organization = req.user.organization;
    if (!req.body.assignedTo) {
      req.body.assignedTo = req.user.id;
    }

    const customer = await Customer.create(req.body);

    // Trigger webhook
    triggerWebhooks(WebhookEvent.CUSTOMER_CREATED, req.user.organization, customer);

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private
export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignedTo', 'name email');

    // Trigger webhook
    triggerWebhooks(WebhookEvent.CUSTOMER_UPDATED, req.user.organization, customer);

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private
export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    await customer.deleteOne();

    // Trigger webhook
    triggerWebhooks(WebhookEvent.CUSTOMER_DELETED, req.user.organization, {
      id: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
