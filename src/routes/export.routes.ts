import express from 'express';
import { exportCustomers, exportDeals, exportTasks } from '../controllers/export.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /exports/customers:
 *   get:
 *     summary: Export customers to CSV
 *     tags: [Export]
 *     description: Exports all customers for the organization to CSV format
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lead, prospect, customer, churned]
 *         description: Filter by customer type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by customer status
 *     responses:
 *       200:
 *         description: CSV file containing customer data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No customers found to export
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/customers').get(exportCustomers);

/**
 * @swagger
 * /exports/deals:
 *   get:
 *     summary: Export deals to CSV
 *     tags: [Export]
 *     description: Exports all deals for the organization to CSV format
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *         description: Filter by deal stage
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by deal status
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *     responses:
 *       200:
 *         description: CSV file containing deal data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No deals found to export
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/deals').get(exportDeals);

/**
 * @swagger
 * /exports/tasks:
 *   get:
 *     summary: Export tasks to CSV
 *     tags: [Export]
 *     description: Exports all tasks for the organization to CSV format
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, canceled]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by task priority
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *     responses:
 *       200:
 *         description: CSV file containing task data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No tasks found to export
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/tasks').get(exportTasks);

export default router;