import express from 'express';
import {
  getOrganization,
  updateOrganization,
  updateSettings,
} from '../controllers/organization.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/').get(getOrganization).put(updateOrganization);

router.route('/settings').put(updateSettings);

export default router;
