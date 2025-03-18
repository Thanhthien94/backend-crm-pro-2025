import { Request, Response, NextFunction } from 'express';
import Organization from '../models/Organization';
import { AppError } from '../middleware/errorHandler';

// @desc    Get organization details
// @route   GET /api/v1/organization
// @access  Private/Admin
export const getOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization
// @route   PUT /api/v1/organization
// @access  Private/Admin
export const updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organization = await Organization.findByIdAndUpdate(req.user.organization, req.body, {
      new: true,
      runValidators: true,
    });

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization settings
// @route   PUT /api/v1/organization/settings
// @access  Private/Admin
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    // Merge existing settings with new settings
    organization.settings = {
      ...organization.settings,
      ...req.body,
    };

    await organization.save();

    res.status(200).json({
      success: true,
      data: organization.settings,
    });
  } catch (error) {
    next(error);
  }
};
