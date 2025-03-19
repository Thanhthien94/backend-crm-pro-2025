import express from 'express';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
} from '../controllers/deal.controller';

const router = express.Router();

// Use API key authentication for all routes
router.use(authenticateApiKey);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers (External API)
 *     tags: [External API]
 *     description: Retrieves all customers for the organization using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or company
 *     responses:
 *       200:
 *         description: List of customers
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
 *                     $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create a new customer (External API)
 *     tags: [External API]
 *     description: Creates a new customer using API key authentication
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have write permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/customers').get(getCustomers).post(createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get a single customer (External API)
 *     tags: [External API]
 *     description: Retrieves a single customer by ID using API key authentication
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   put:
 *     summary: Update a customer (External API)
 *     tags: [External API]
 *     description: Updates a customer using API key authentication
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have write permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   delete:
 *     summary: Delete a customer (External API)
 *     tags: [External API]
 *     description: Deletes a customer using API key authentication
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have delete permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/customers/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

/**
 * @swagger
 * /api/deals:
 *   get:
 *     summary: Get all deals (External API)
 *     tags: [External API]
 *     description: Retrieves all deals for the organization using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   post:
 *     summary: Create a new deal (External API)
 *     tags: [External API]
 *     description: Creates a new deal using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *               customer:
 *                 type: string
 *               value:
 *                 type: number
 *               currency:
 *                 type: string
 *               stage:
 *                 type: string
 *                 enum: [lead, qualified, proposal, negotiation, closed-won, closed-lost]
 *               probability:
 *                 type: number
 *               expectedCloseDate:
 *                 type: string
 *                 format: date-time
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have write permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/deals').get(getDeals).post(createDeal);

/**
 * @swagger
 * /api/deals/{id}:
 *   get:
 *     summary: Get a single deal (External API)
 *     tags: [External API]
 *     description: Retrieves a single deal by ID using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   put:
 *     summary: Update a deal (External API)
 *     tags: [External API]
 *     description: Updates a deal using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have write permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   delete:
 *     summary: Delete a deal (External API)
 *     tags: [External API]
 *     description: Deletes a deal using API key authentication
 *     security:
 *       - apiKeyAuth: []
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
 *         description: Invalid or insufficient API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: API key doesn't have delete permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/deals/:id').get(getDeal).put(updateDeal).delete(deleteDeal);

export default router;