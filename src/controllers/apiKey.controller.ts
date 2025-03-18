import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import ApiKey from '../models/ApiKey';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all API keys for organization
// @route   GET /api/v1/apikeys
// @access  Private/Admin
export const getApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await ApiKey.find({
      organization: req.user.organization,
    })
      .select('-key') // Don't return the actual key in lists
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: apiKeys.length,
      data: apiKeys,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create API key
// @route   POST /api/v1/apikeys
// @access  Private/Admin
export const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate permissions
    const validPermissions = ['read', 'write', 'delete'];
    const invalidPermissions = req.body.permissions?.filter(
      (p: string) => !validPermissions.includes(p)
    );

    if (invalidPermissions && invalidPermissions.length > 0) {
      return next(new AppError(`Invalid permissions: ${invalidPermissions.join(', ')}`, 400));
    }

    // Add organization and user info
    req.body.organization = req.user.organization;
    req.body.createdBy = req.user.id;

    const apiKey = await ApiKey.create(req.body);

    // Get full key value before it's excluded from responses
    const keyValue = apiKey.key;

    res.status(201).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        key: keyValue, // Only return full key on creation
        permissions: apiKey.permissions,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single API key
// @route   GET /api/v1/apikeys/:id
// @access  Private/Admin
export const getApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    })
      .select('-key') // Don't return the actual key
      .populate('createdBy', 'name email');

    if (!apiKey) {
      return next(new AppError('API key not found', 404));
    }

    res.status(200).json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update API key
// @route   PUT /api/v1/apikeys/:id
// @access  Private/Admin
export const updateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!apiKey) {
      return next(new AppError('API key not found', 404));
    }

    // Cannot update the key itself
    delete req.body.key;

    // Validate permissions if provided
    if (req.body.permissions) {
      const validPermissions = ['read', 'write', 'delete'];
      const invalidPermissions = req.body.permissions.filter(
        (p: string) => !validPermissions.includes(p)
      );

      if (invalidPermissions.length > 0) {
        return next(new AppError(`Invalid permissions: ${invalidPermissions.join(', ')}`, 400));
      }
    }

    apiKey = await ApiKey.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .select('-key')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete API key
// @route   DELETE /api/v1/apikeys/:id
// @access  Private/Admin
export const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!apiKey) {
      return next(new AppError('API key not found', 404));
    }

    await apiKey.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke API key
// @route   PUT /api/v1/apikeys/:id/revoke
// @access  Private/Admin
export const revokeApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!apiKey) {
      return next(new AppError('API key not found', 404));
    }

    // Revoke key by setting isActive to false
    apiKey.isActive = false;
    await apiKey.save();

    res.status(200).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        isActive: false,
        message: 'API key revoked successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate API key
// @route   POST /api/v1/apikeys/:id/regenerate
// @access  Private/Admin
export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!apiKey) {
      return next(new AppError('API key not found', 404));
    }

    // Generate new key
    const crypto = require('crypto');
    const newKey = `crm_${crypto.randomBytes(32).toString('hex')}`;

    apiKey.key = newKey;
    apiKey.isActive = true;
    await apiKey.save();

    res.status(200).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        key: newKey, // Return the new key
        isActive: true,
        message: 'API key regenerated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
