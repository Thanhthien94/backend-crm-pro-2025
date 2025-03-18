import express from 'express';
import { exportCustomers, exportDeals, exportTasks } from '../controllers/export.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.route('/customers').get(exportCustomers);
router.route('/deals').get(exportDeals);
router.route('/tasks').get(exportTasks);

export default router;
