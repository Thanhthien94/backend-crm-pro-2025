import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Organization from '../models/Organization';
import { AppError } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, organizationName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError('User already exists', 400));
    }

    // Create organization first
    const organization = await Organization.create({
      name: organizationName,
      domain: email.split('@')[1],
    });

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      organization: organization._id,
      role: 'admin', // First user is admin
    });

    // Generate token
    const token = user.getSignedJwtToken();

    // Set token in HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'lax' as const,
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
      success: true,
      token, // Still include token in response for client storage if needed
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: organization._id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Get organization info
    const organization = await Organization.findById(user.organization);
    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    // Check if organization is active
    if (!organization.isActive) {
      return next(new AppError('Organization account is suspended', 403));
    }

    // Generate token
    const token = user.getSignedJwtToken();

    // Set token in HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'lax' as const,
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      success: true,
      token, // Still include token in response for client storage if needed
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: organization._id,
          name: organization.name,
          plan: organization.plan,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const organization = await Organization.findById(user.organization);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: organization
          ? {
              id: organization._id,
              name: organization.name,
              plan: organization.plan,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
export const logout = (req: Request, res: Response) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};
