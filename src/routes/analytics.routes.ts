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

// All users can access dashboard stats and pipeline
router.route('/dashboard').get(getDashboardStats);
router.route('/pipeline').get(getPipelineReport);
router.route('/sales').get(getSalesReport);

// Only admins can see performance reports
router.route('/performance').get(authorize('admin', 'superadmin'), getPerformanceReport);

export default router;
