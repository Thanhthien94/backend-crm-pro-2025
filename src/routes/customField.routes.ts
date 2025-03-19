import express from 'express';
import { body } from 'express-validator';
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
} from '../controllers/customField.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /customfields/{entity}:
 *   get:
 *     summary: Get all custom fields for an entity
 *     tags: [Custom Fields]
 *     description: Retrieves all custom fields for a specific entity type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *           enum: [customer, deal, task]
 *         description: Entity type
 *     responses:
 *       200:
 *         description: List of custom fields
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomField'
 *       400:
 *         description: Invalid entity type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/:entity').get(getCustomFields);

// Admin operations
router.use(authorize('admin', 'superadmin'));

/**
 * @swagger
 * /customfields:
 *   post:
 *     summary: Create a new custom field
 *     tags: [Custom Fields]
 *     description: Creates a new custom field for an entity
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
 *               - label
 *               - type
 *               - entity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Field name (no spaces, lowercase)
 *                 example: "industry"
 *               label:
 *                 type: string
 *                 description: Display label
 *                 example: "Industry"
 *               type:
 *                 type: string
 *                 enum: [text, number, date, dropdown, checkbox, email, phone, url]
 *                 description: Field type
 *                 example: "dropdown"
 *               entity:
 *                 type: string
 *                 enum: [customer, deal, task]
 *                 description: Entity type this field belongs to
 *                 example: "customer"
 *               required:
 *                 type: boolean
 *                 description: Whether field is required
 *                 default: false
 *                 example: false
 *               default:
 *                 type: string
 *                 description: Default value
 *                 example: "Technology"
 *               options:
 *                 type: array
 *                 description: Options for dropdown fields
 *                 items:
 *                   type: string
 *                 example: ["Technology", "Finance", "Healthcare", "Retail"]
 *     responses:
 *       201:
 *         description: Custom field created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomField'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.route('/').post(
  [
    body('name')
      .notEmpty()
      .withMessage('Field name is required')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Field name can only contain letters, numbers and underscores'),
    body('label').notEmpty().withMessage('Field label is required'),
    body('type')
      .isIn(['text', 'number', 'date', 'dropdown', 'checkbox', 'email', 'phone', 'url'])
      .withMessage('Invalid field type'),
    body('entity').isIn(['customer', 'deal', 'task']).withMessage('Invalid entity type'),
  ],
  createCustomField
);

/**
 * @swagger
 * /customfields/{id}:
 *   put:
 *     summary: Update a custom field
 *     tags: [Custom Fields]
 *     description: Updates an existing custom field
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 description: Display label
 *               type:
 *                 type: string
 *                 enum: [text, number, date, dropdown, checkbox, email, phone, url]
 *                 description: Field type
 *               required:
 *                 type: boolean
 *                 description: Whether field is required
 *               default:
 *                 type: string
 *                 description: Default value
 *               options:
 *                 type: array
 *                 description: Options for dropdown fields
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 description: Whether field is active
 *     responses:
 *       200:
 *         description: Custom field updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomField'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 * 
 *   delete:
 *     summary: Delete a custom field
 *     tags: [Custom Fields]
 *     description: Deletes a custom field (marks as inactive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *     responses:
 *       200:
 *         description: Custom field deleted successfully
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
router.route('/:id').put(updateCustomField).delete(deleteCustomField);

export default router;