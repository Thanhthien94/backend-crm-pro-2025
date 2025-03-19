// src/swagger/requestBodies.ts
/**
 * @swagger
 * components:
 *   requestBodies:
 *     CustomerBody:
 *       description: Thông tin khách hàng
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     
 *     DealBody:
 *       description: Thông tin deal
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
 *               notes:
 *                 type: string
 *               customFields:
 *                 type: object
 *     
 *     TaskBody:
 *       description: Thông tin task
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
 */