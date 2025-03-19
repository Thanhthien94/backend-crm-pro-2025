import express from 'express';
import {
  getDashboardStats,
  getSalesReport,
  getPerformanceReport,
  getPipelineReport,
} from '../controllers/analytics.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Analytics]
 *     description: Retrieves key metrics and statistics for the dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/dashboard').get(getDashboardStats);

/**
 * @swagger
 * /analytics/pipeline:
 *   get:
 *     summary: Get deal pipeline report
 *     tags: [Analytics]
 *     description: Retrieves deal pipeline statistics and conversion rates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pipeline statistics
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
 *                     pipeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           stage:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           totalValue:
 *                             type: number
 *                           avgValue:
 *                             type: number
 *                           deals:
 *                             type: array
 *                             items:
 *                               type: object
 *                     conversions:
 *                       type: object
 *                       properties:
 *                         leadToQualified:
 *                           type: number
 *                         qualifiedToProposal:
 *                           type: number
 *                         proposalToNegotiation:
 *                           type: number
 *                         negotiationToClosedWon:
 *                           type: number
 *                         overallConversion:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/pipeline').get(getPipelineReport);

/**
 * @swagger
 * /analytics/sales:
 *   get:
 *     summary: Get sales reports
 *     tags: [Analytics]
 *     description: Retrieves sales data aggregated by time period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Time aggregation period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report range
 *     responses:
 *       200:
 *         description: Sales report data
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
 *                     deals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           totalValue:
 *                             type: number
 *                           wonValue:
 *                             type: number
 *                           lostValue:
 *                             type: number
 *                           wonCount:
 *                             type: integer
 *                           lostCount:
 *                             type: integer
 *                           conversionRate:
 *                             type: number
 *                     customers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           leads:
 *                             type: integer
 *                           prospects:
 *                             type: integer
 *                           customers:
 *                             type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/sales').get(getSalesReport);

/**
 * @swagger
 * /analytics/performance:
 *   get:
 *     summary: Get sales performance by user
 *     tags: [Analytics]
 *     description: Retrieves sales performance metrics by user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report range
 *     responses:
 *       200:
 *         description: User performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       totalDeals:
 *                         type: integer
 *                       totalValue:
 *                         type: number
 *                       wonDeals:
 *                         type: integer
 *                       wonValue:
 *                         type: number
 *                       lostDeals:
 *                         type: integer
 *                       avgDealSize:
 *                         type: number
 *                       winRate:
 *                         type: number
 *                       completedTasks:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.route('/performance').get(authorize('admin', 'superadmin'), getPerformanceReport);

export default router;