import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all users in organization
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ organization: req.user.organization }).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    }).select('-password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Set organization to the admin's organization
    req.body.organization = req.user.organization;

    // Check if email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Find user to ensure they exist and belong to organization
    let user = await User.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Remove password from update if included
    if (req.body.password) {
      delete req.body.password;
    }

    // Don't allow changing organization
    if (req.body.organization) {
      delete req.body.organization;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) {
      return next(new AppError('User not found after update', 404));
    }

    user = updatedUser as any;
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Don't allow deleting self
    if (req.params.id === req.user.id) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    const user = await User.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fields to update
    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      email: req.body.email || req.user.email,
    };

    // Update user
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/users/updatepassword
// @access  Private
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
