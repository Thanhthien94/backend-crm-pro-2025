import { Request, Response, NextFunction } from 'express';
import ApiKey from '../models/ApiKey';
import Organization from '../models/Organization';
import { AppError } from './errorHandler';

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  let key;

  // Check for API key in header or query string
  if (req.headers['x-api-key']) {
    key = req.headers['x-api-key'];
  } else if (req.query.apiKey) {
    key = req.query.apiKey;
  }

  if (!key) {
    return next(new AppError('API key is required', 401));
  }

  try {
    // Find API key
    const apiKey = await ApiKey.findOne({ key, isActive: true });

    if (!apiKey) {
      return next(new AppError('Invalid or inactive API key', 401));
    }

    // Check if key has expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return next(new AppError('API key has expired', 401));
    }

    // Check if organization is active
    const organization = await Organization.findById(apiKey.organization);
    if (!organization || !organization.isActive) {
      return next(new AppError('Organization is inactive or not found', 401));
    }

    // Check API key permissions for the requested operation
    const method = req.method.toLowerCase();
    let requiredPermission = 'read';

    if (method === 'post') {
      requiredPermission = 'write';
    } else if (method === 'put' || method === 'patch') {
      requiredPermission = 'write';
    } else if (method === 'delete') {
      requiredPermission = 'delete';
    }

    if (!apiKey.permissions.includes(requiredPermission) && !apiKey.permissions.includes('*')) {
      return next(new AppError(`API key doesn't have ${requiredPermission} permission`, 403));
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date();
    await apiKey.save();

    // Attach API key info to request
    (req as any).apiKey = apiKey;
    req.user = { organization: apiKey.organization.toString() };

    next();
  } catch (error) {
    next(new AppError('API key authentication failed', 401));
  }
};
