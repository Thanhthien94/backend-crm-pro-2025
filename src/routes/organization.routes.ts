import express from 'express';
import {
  getOrganization,
  updateOrganization,
  updateSettings,
} from '../controllers/organization.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

/**
 * @swagger
 * /organization:
 *   get:
 *     summary: Get organization details
 *     tags: [Organizations]
 *     description: Retrieves details of the current organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   
 *   put:
 *     summary: Update organization details
 *     tags: [Organizations]
 *     description: Updates organization information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *               domain:
 *                 type: string
 *                 description: Organization domain
 *               address:
 *                 type: string
 *                 description: Organization address
 *               phone:
 *                 type: string
 *                 description: Organization phone number
 *             example:
 *               name: "Updated Company Name"
 *               domain: "updatedcompany.com"
 *               address: "123 Business Ave, Suite 500"
 *               phone: "+1-555-123-4567"
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.route('/').get(getOrganization).put(updateOrganization);

/**
 * @swagger
 * /organization/settings:
 *   put:
 *     summary: Update organization settings
 *     tags: [Organizations]
 *     description: Updates organization settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Settings object with custom properties
 *             example:
 *               theme: "dark"
 *               notifications: true
 *               modules:
 *                 customers: true
 *                 deals: true
 *                 tasks: true
 *                 reports: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
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
 *                   description: Updated settings object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.route('/settings').put(updateSettings);

export default router;