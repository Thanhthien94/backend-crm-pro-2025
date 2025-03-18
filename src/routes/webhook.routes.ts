import express from 'express';
import { body } from 'express-validator';
import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  resetWebhookSecret,
  testWebhook,
} from '../controllers/webhook.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

router
  .route('/')
  .get(getWebhooks)
  .post(
    [
      body('name').notEmpty().withMessage('Webhook name is required'),
      body('url').isURL().withMessage('Please include a valid URL'),
      body('events').isArray({ min: 1 }).withMessage('Please include at least one event'),
    ],
    createWebhook
  );

router.route('/:id').get(getWebhook).put(updateWebhook).delete(deleteWebhook);

router.route('/:id/reset-secret').post(resetWebhookSecret);

router.route('/:id/test').post(testWebhook);

export default router;
