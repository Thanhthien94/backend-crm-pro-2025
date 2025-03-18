import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Webhook from '../models/Webhook';
import { WebhookEvent } from '../services/webhook.service';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all webhooks for organization
// @route   GET /api/v1/webhooks
// @access  Private/Admin
export const getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = await Webhook.find({
      organization: req.user.organization,
    }).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: webhooks.length,
      data: webhooks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single webhook
// @route   GET /api/v1/webhooks/:id
// @access  Private/Admin
export const getWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    }).populate('createdBy', 'name email');

    if (!webhook) {
      return next(new AppError('Webhook not found', 404));
    }

    res.status(200).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create webhook
// @route   POST /api/v1/webhooks
// @access  Private/Admin
export const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate events
    const validEvents = Object.values(WebhookEvent);
    const invalidEvents = req.body.events.filter(
      (event: string) => !validEvents.includes(event as WebhookEvent)
    );

    if (invalidEvents.length > 0) {
      return next(new AppError(`Invalid events: ${invalidEvents.join(', ')}`, 400));
    }

    // Add organization and user info
    req.body.organization = req.user.organization;
    req.body.createdBy = req.user.id;

    const webhook = await Webhook.create(req.body);

    // Populate response
    const populatedWebhook = await Webhook.findById(webhook._id).populate(
      'createdBy',
      'name email'
    );

    res.status(201).json({
      success: true,
      data: populatedWebhook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update webhook
// @route   PUT /api/v1/webhooks/:id
// @access  Private/Admin
export const updateWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let webhook = await Webhook.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!webhook) {
      return next(new AppError('Webhook not found', 404));
    }

    // Validate events if provided
    if (req.body.events) {
      const validEvents = Object.values(WebhookEvent);
      const invalidEvents = req.body.events.filter(
        (event: string) => !validEvents.includes(event as WebhookEvent)
      );

      if (invalidEvents.length > 0) {
        return next(new AppError(`Invalid events: ${invalidEvents.join(', ')}`, 400));
      }
    }

    // Update webhook
    webhook = await Webhook.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete webhook
// @route   DELETE /api/v1/webhooks/:id
// @access  Private/Admin
export const deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!webhook) {
      return next(new AppError('Webhook not found', 404));
    }

    await webhook.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset webhook secret
// @route   POST /api/v1/webhooks/:id/reset-secret
// @access  Private/Admin
export const resetWebhookSecret = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!webhook) {
      return next(new AppError('Webhook not found', 404));
    }

    // Generate new secret key
    const crypto = require('crypto');
    webhook.secretKey = crypto.randomBytes(32).toString('hex');

    await webhook.save();

    res.status(200).json({
      success: true,
      data: {
        secretKey: webhook.secretKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test webhook
// @route   POST /api/v1/webhooks/:id/test
// @access  Private/Admin
export const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!webhook) {
      return next(new AppError('Webhook not found', 404));
    }

    // Test payload
    const testPayload = {
      event: webhook.events[0] || WebhookEvent.CUSTOMER_CREATED,
      timestamp: Date.now(),
      organization: req.user.organization,
      data: {
        test: true,
        message: 'This is a test webhook payload',
      },
    };

    // Generate signature
    const signature = webhook.generateSignature(testPayload);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-CRM-Signature': signature,
      'X-CRM-Event': testPayload.event,
      ...webhook.headers,
    };

    // Send test webhook
    try {
      const axios = require('axios');
      const response = await axios.post(webhook.url, testPayload, {
        headers,
        timeout: 10000, // 10 second timeout
      });

      res.status(200).json({
        success: true,
        data: {
          statusCode: response.status,
          message: 'Test webhook sent successfully',
        },
      });
    } catch (error: any) {
      return next(new AppError(`Test webhook failed: ${error.message}`, 400));
    }
  } catch (error) {
    next(error);
  }
};
