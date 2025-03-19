import express from 'express';
import { body } from 'express-validator';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getRelatedTasks,
} from '../controllers/task.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     description: Retrieves a paginated list of tasks for the organization
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
 *       - in: query
 *         name: my
 *         schema:
 *           type: string
 *           enum: [true]
 *         description: Get only tasks assigned to current user
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: string
 *           enum: [true]
 *         description: Get only overdue tasks
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: string
 *           enum: [true]
 *         description: Get only upcoming tasks (due in next 7 days)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title or description
 *     responses:
 *       200:
 *         description: List of tasks
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
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 * 
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     description: Creates a new task in the system
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Task priority
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, canceled]
 *                 default: pending
 *                 description: Task status
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign
 *               relatedTo:
 *                 type: object
 *                 description: Related entity
 *                 properties:
 *                   model:
 *                     type: string
 *                     enum: [Customer, Deal]
 *                   id:
 *                     type: string
 *               reminderDate:
 *                 type: string
 *                 format: date-time
 *                 description: Reminder date
 *             example:
 *               title: "Follow up with client"
 *               description: "Call to discuss contract details"
 *               dueDate: "2023-06-15T14:00:00Z"
 *               priority: "high"
 *               assignedTo: "60d21b4667d0d8992e610c85"
 *               relatedTo:
 *                 model: "Customer"
 *                 id: "60d21b4667d0d8992e610c90"
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router
  .route('/')
  .get(getTasks)
  .post([body('title').notEmpty().withMessage('Task title is required')], createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task
 *     tags: [Tasks]
 *     description: Retrieves a single task by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     description: Updates an existing task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, canceled]
 *               assignedTo:
 *                 type: string
 *               relatedTo:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     enum: [Customer, Deal]
 *                   id:
 *                     type: string
 *               reminderDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 * 
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     description: Deletes a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
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
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

/**
 * @swagger
 * /tasks/related/{model}/{id}:
 *   get:
 *     summary: Get tasks related to an entity
 *     tags: [Tasks]
 *     description: Retrieves tasks related to a specific entity (Customer or Deal)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: model
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Customer, Deal]
 *         description: Related entity type
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Related entity ID
 *     responses:
 *       200:
 *         description: List of related tasks
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
 *                     $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid model type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/related/:model/:id').get(getRelatedTasks);

export default router;