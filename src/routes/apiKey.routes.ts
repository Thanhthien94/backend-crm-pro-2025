import express from 'express';
import { body } from 'express-validator';
import {
  getApiKeys,
  getApiKey,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  regenerateApiKey,
} from '../controllers/apiKey.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

router
  .route('/')
  .get(getApiKeys)
  .post(
    [
      body('name').notEmpty().withMessage('API key name is required'),
      body('permissions').isArray().withMessage('Permissions must be an array'),
    ],
    createApiKey
  );

router.route('/:id').get(getApiKey).put(updateApiKey).delete(deleteApiKey);

router.route('/:id/revoke').put(revokeApiKey);

router.route('/:id/regenerate').post(regenerateApiKey);

export default router;
