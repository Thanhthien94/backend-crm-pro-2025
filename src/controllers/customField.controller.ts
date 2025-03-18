import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import CustomField from '../models/CustomField';
import { AppError } from '../middleware/errorHandler';

// @desc    Get custom fields for organization by entity
// @route   GET /api/v1/customfields/:entity
// @access  Private
export const getCustomFields = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity } = req.params;

    if (!['customer', 'deal', 'task'].includes(entity)) {
      return next(new AppError('Invalid entity type', 400));
    }

    const fields = await CustomField.find({
      organization: req.user.organization,
      entity,
      isActive: true,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: fields.length,
      data: fields,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create custom field
// @route   POST /api/v1/customfields
// @access  Private/Admin
export const createCustomField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Add organization
    req.body.organization = req.user.organization;

    // Validate that dropdown fields have options
    if (req.body.type === 'dropdown' && (!req.body.options || req.body.options.length === 0)) {
      return next(new AppError('Dropdown fields must have options', 400));
    }

    // Sanitize field name - no spaces, lowercase
    req.body.name = req.body.name.toLowerCase().replace(/\s+/g, '_');

    // Check if field name already exists for this entity in this organization
    const existingField = await CustomField.findOne({
      name: req.body.name,
      entity: req.body.entity,
      organization: req.user.organization,
    });

    if (existingField) {
      return next(new AppError('Field name already exists for this entity', 400));
    }

    const customField = await CustomField.create(req.body);

    res.status(201).json({
      success: true,
      data: customField,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update custom field
// @route   PUT /api/v1/customfields/:id
// @access  Private/Admin
export const updateCustomField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let customField = await CustomField.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!customField) {
      return next(new AppError('Custom field not found', 404));
    }

    // Don't allow changing the field name or entity type
    delete req.body.name;
    delete req.body.entity;
    delete req.body.organization;

    // Validate that dropdown fields have options
    if (req.body.type === 'dropdown' && (!req.body.options || req.body.options.length === 0)) {
      return next(new AppError('Dropdown fields must have options', 400));
    }

    customField = await CustomField.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: customField,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom field
// @route   DELETE /api/v1/customfields/:id
// @access  Private/Admin
export const deleteCustomField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customField = await CustomField.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!customField) {
      return next(new AppError('Custom field not found', 404));
    }

    // Instead of deleting, mark as inactive
    customField.isActive = false;
    await customField.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
