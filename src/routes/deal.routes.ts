import express from 'express';
import { body } from 'express-validator';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  addActivity,
} from '../controllers/deal.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /deals:
 *   get:
 *     summary: Get all deals
 *     tags: [Deals]
 *     description: Retrieves a paginated list of deals for the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
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
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title
 *     responses:
 *       200:
 *         description: List of deals
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
 *                   example: 10
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Deal'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 * 
 *   post:
 *     summary: Create a new deal
 *     tags: [Deals]
 *     description: Creates a new deal in the system
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - customer
 *             properties:
 *               title:
 *                 type: string
 *                 description: Deal title
 *               customer:
 *                 type: string
 *                 description: Customer ID
 *               value:
 *                 type: number
 *                 description: Deal value
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 default: USD
 *               stage:
 *                 type: string
 *                 description: Deal stage
 *                 enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *                 default: lead
 *               status:
 *                 type: string
 *                 description: Deal status
 *                 enum: [active, inactive]
 *                 default: active
 *               probability:
 *                 type: number
 *                 description: Win probability percentage
 *               expectedCloseDate:
 *                 type: string
 *                 format: date-time
 *                 description: Expected close date
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: number
 *               notes:
 *                 type: string
 *               customFields:
 *                 type: object
 *             example:
 *               title: "New Enterprise Deal"
 *               customer: "60d21b4667d0d8992e610c90"
 *               value: 50000
 *               currency: "USD"
 *               stage: "proposal"
 *               expectedCloseDate: "2023-08-30T00:00:00Z"
 *     responses:
 *       201:
 *         description: Deal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Deal'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route('/')
  .get(getDeals)
  .post(
    [
      body('title').notEmpty().withMessage('Deal title is required'),
      body('customer').notEmpty().withMessage('Customer is required'),
    ],
    createDeal
  );

/**
 * @swagger
 * /deals/{id}:
 *   get:
 *     summary: Get a single deal
 *     tags: [Deals]
 *     description: Retrieves a single deal by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deal ID
 *     responses:
 *       200:
 *         description: Deal details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Deal'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   
 *   put:
 *     summary: Update a deal
 *     tags: [Deals]
 *     description: Updates an existing deal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               customer:
 *                 type: string
 *               value:
 *                 type: number
 *               currency:
 *                 type: string
 *               stage:
 *                 type: string
 *                 enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               probability:
 *                 type: number
 *               expectedCloseDate:
 *                 type: string
 *                 format: date-time
 *               assignedTo:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: number
 *               notes:
 *                 type: string
 *               customFields:
 *                 type: object
 *     responses:
 *       200:
 *         description: Deal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Deal'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 * 
 *   delete:
 *     summary: Delete a deal
 *     tags: [Deals]
 *     description: Deletes a deal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deal ID
 *     responses:
 *       200:
 *         description: Deal deleted successfully
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
 */
router.route('/:id').get(getDeal).put(updateDeal).delete(deleteDeal);

/**
 * @swagger
 * /deals/{id}/activities:
 *   post:
 *     summary: Add an activity to a deal
 *     tags: [Deals]
 *     description: Adds a new activity to an existing deal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [note, call, meeting, email, task]
 *                 description: Activity type
 *               description:
 *                 type: string
 *                 description: Activity details
 *             example:
 *               type: "call"
 *               description: "Follow-up call to discuss pricing"
 *     responses:
 *       200:
 *         description: Activity added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Deal'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/:id/activities').post(addActivity);

export default router;