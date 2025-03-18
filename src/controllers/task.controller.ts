import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Task from '../models/Task';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all tasks for organization
// @route   GET /api/v1/tasks
// @access  Private
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const query: any = { organization: req.user.organization };

    // Add filters if provided
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;

    // For tasks assigned to current user
    if (req.query.my === 'true') {
      query.assignedTo = req.user.id;
    }

    // For overdue tasks
    if (req.query.overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'completed' };
    }

    // For upcoming tasks
    if (req.query.upcoming === 'true') {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      query.dueDate = { $gte: today, $lte: nextWeek };
      query.status = { $ne: 'completed' };
    }

    // Search by title
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const totalTasks = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: {
        total: totalTasks,
        page,
        pages: Math.ceil(totalTasks / limit),
      },
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/v1/tasks/:id
// @access  Private
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task
// @route   POST /api/v1/tasks
// @access  Private
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Add organization and user info
    req.body.organization = req.user.organization;
    req.body.createdBy = req.user.id;

    if (!req.body.assignedTo) {
      req.body.assignedTo = req.user.id;
    }

    const task = await Task.create(req.body);

    // Populate response
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/v1/tasks/:id
// @access  Private
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    // If status changes to completed, add completed info
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedDate = new Date();
      req.body.completedBy = req.user.id;
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:id
// @access  Private
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks by related entity
// @route   GET /api/v1/tasks/related/:model/:id
// @access  Private
export const getRelatedTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model, id } = req.params;

    if (!['Customer', 'Deal'].includes(model)) {
      return next(new AppError('Invalid related model', 400));
    }

    const tasks = await Task.find({
      organization: req.user.organization,
      'relatedTo.model': model,
      'relatedTo.id': id,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};
