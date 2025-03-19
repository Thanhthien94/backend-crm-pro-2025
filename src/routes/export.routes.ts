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
 *       - $ref: '#/components/parameters/CustomerTypeParam'
 *       - $ref: '#/components/parameters/StatusParam'
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
 *         $ref: '#/components/responses/NotFoundError'
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
 *       - $ref: '#/components/parameters/DealStageParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *       - $ref: '#/components/parameters/AssignedToParam'
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
 *         $ref: '#/components/responses/NotFoundError'
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
 *       - $ref: '#/components/parameters/TaskStatusParam'
 *       - $ref: '#/components/parameters/TaskPriorityParam'
 *       - $ref: '#/components/parameters/AssignedToParam'
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
 *         $ref: '#/components/responses/NotFoundError'
 */
router.route('/tasks').get(exportTasks);

export default router;