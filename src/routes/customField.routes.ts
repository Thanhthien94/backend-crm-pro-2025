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

// All users can get custom fields
router.route('/:entity').get(getCustomFields);

// Admin operations
router.use(authorize('admin', 'superadmin'));

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

router.route('/:id').put(updateCustomField).delete(deleteCustomField);

export default router;
