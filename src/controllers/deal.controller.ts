import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Deal from '../models/Deal';
import Customer from '../models/Customer';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all deals for organization
// @route   GET /api/v1/deals
// @access  Private
export const getDeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.stage) query.stage = req.query.stage;
    if (req.query.status) query.status = req.query.status;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
    if (req.query.customer) query.customer = req.query.customer;

    // Search by title
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }

    const totalDeals = await Deal.countDocuments(query);

    const deals = await Deal.find(query)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deals.length,
      pagination: {
        total: totalDeals,
        page,
        pages: Math.ceil(totalDeals / limit),
      },
      data: deals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single deal
// @route   GET /api/v1/deals/:id
// @access  Private
export const getDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('activities.user', 'name');

    if (!deal) {
      return next(new AppError('Deal not found', 404));
    }

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new deal
// @route   POST /api/v1/deals
// @access  Private
export const createDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify customer exists and belongs to organization
    const customer = await Customer.findOne({
      _id: req.body.customer,
      organization: req.user.organization,
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Add organization and user info
    req.body.organization = req.user.organization;
    if (!req.body.assignedTo) {
      req.body.assignedTo = req.user.id;
    }

    // Set probability based on stage if not provided
    if (!req.body.probability) {
      const probabilities: Record<string, number> = {
        lead: 10,
        qualified: 25,
        proposal: 50,
        negotiation: 75,
        'closed-won': 100,
        'closed-lost': 0,
      };
      req.body.probability = probabilities[req.body.stage || 'lead'];
    }

    const deal = await Deal.create(req.body);

    // Add initial activity
    deal.activities = [
      {
        type: 'note',
        description: 'Deal created',
        user: req.user.id,
        date: new Date(),
      },
    ];
    await deal.save();

    // Populate response
    const populatedDeal = await Deal.findById(deal._id)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('activities.user', 'name');

    res.status(201).json({
      success: true,
      data: populatedDeal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update deal
// @route   PUT /api/v1/deals/:id
// @access  Private
export const updateDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!deal) {
      return next(new AppError('Deal not found', 404));
    }

    // If stage changes, add activity
    if (req.body.stage && req.body.stage !== deal.stage) {
      if (!req.body.activities) {
        req.body.activities = deal.activities || [];
      }

      req.body.activities.push({
        type: 'note',
        description: `Stage changed from ${deal.stage} to ${req.body.stage}`,
        user: req.user.id,
        date: new Date(),
      });
    }

    deal = await Deal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('activities.user', 'name');

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete deal
// @route   DELETE /api/v1/deals/:id
// @access  Private
export const deleteDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!deal) {
      return next(new AppError('Deal not found', 404));
    }

    await deal.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add activity to deal
// @route   POST /api/v1/deals/:id/activities
// @access  Private
export const addActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, description } = req.body;

    if (!type || !description) {
      return next(new AppError('Please provide type and description', 400));
    }

    const deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!deal) {
      return next(new AppError('Deal not found', 404));
    }

    const newActivity = {
      type,
      description,
      user: req.user.id,
      date: new Date(),
    };

    deal.activities = [...(deal.activities || []), newActivity];
    await deal.save();

    const updatedDeal = await Deal.findById(deal._id)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('activities.user', 'name');

    res.status(200).json({
      success: true,
      data: updatedDeal,
    });
  } catch (error) {
    next(error);
  }
};
