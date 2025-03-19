import express from 'express';
import { importCustomers, upload } from '../controllers/import.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /imports/customers:
 *   post:
 *     summary: Import customers from CSV
 *     tags: [Import]
 *     description: Imports customers from a CSV file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing customer data
 *     responses:
 *       200:
 *         description: Import results
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
 *                     total:
 *                       type: integer
 *                       description: Total records in CSV
 *                       example: 100
 *                     imported:
 *                       type: integer
 *                       description: Records successfully imported
 *                       example: 95
 *                     skipped:
 *                       type: integer
 *                       description: Records skipped due to errors
 *                       example: 5
 *                     errors:
 *                       type: array
 *                       description: Error messages
 *                       items:
 *                         type: string
 *                       example: ["Row skipped: Missing name or email for entry: unknown"]
 *       400:
 *         description: Invalid file or format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/customers').post(upload, importCustomers);

export default router;