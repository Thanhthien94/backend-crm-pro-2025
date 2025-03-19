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

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: Get all webhooks
 *     tags: [Webhooks]
 *     description: Retrieves all webhooks for the organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Webhook'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   
 *   post:
 *     summary: Create a new webhook
 *     tags: [Webhooks]
 *     description: Creates a new webhook for event notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *               - events
 *             properties:
 *               name:
 *                 type: string
 *                 description: Webhook name
 *                 example: "New Customer Notification"
 *               url:
 *                 type: string
 *                 description: Target URL for webhook
 *                 example: "https://example.com/webhooks/crm"
 *               events:
 *                 type: array
 *                 description: Events to trigger webhook
 *                 items:
 *                   type: string
 *                   enum: [customer.created, customer.updated, customer.deleted, deal.created, deal.updated, deal.stage_changed, deal.deleted, task.created, task.completed, task.deleted]
 *                 example: ["customer.created", "customer.updated"]
 *               headers:
 *                 type: object
 *                 description: Custom headers to include
 *                 example:
 *                   X-Custom-Header: "Custom-Value"
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Webhook'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     summary: Get a single webhook
 *     tags: [Webhooks]
 *     description: Retrieves a single webhook by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Webhook details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Webhook'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   put:
 *     summary: Update a webhook
 *     tags: [Webhooks]
 *     description: Updates an existing webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Webhook name
 *               url:
 *                 type: string
 *                 description: Target URL
 *               events:
 *                 type: array
 *                 description: Events to trigger webhook
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, failed]
 *                 description: Webhook status
 *               headers:
 *                 type: object
 *                 description: Custom headers
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Webhook'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     description: Deletes a webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {}
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.route('/:id').get(getWebhook).put(updateWebhook).delete(deleteWebhook);

/**
 * @swagger
 * /webhooks/{id}/reset-secret:
 *   post:
 *     summary: Reset webhook secret
 *     tags: [Webhooks]
 *     description: Generates a new secret key for webhook signature verification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Secret key reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     secretKey:
 *                       type: string
 *                       example: "9876543210abcdef9876543210abcdef"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.route('/:id/reset-secret').post(resetWebhookSecret);

/**
 * @swagger
 * /webhooks/{id}/test:
 *   post:
 *     summary: Test webhook
 *     tags: [Webhooks]
 *     description: Sends a test payload to the webhook endpoint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Test webhook sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     statusCode:
 *                       type: integer
 *                       example: 200
 *                     message:
 *                       type: string
 *                       example: "Test webhook sent successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.route('/:id/test').post(testWebhook);

export default router;