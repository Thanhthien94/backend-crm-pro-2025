import express from 'express';
import { body } from 'express-validator';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getCustomers)
  .post(
    [
      body('name').notEmpty().withMessage('Customer name is required'),
      body('email').isEmail().withMessage('Please include a valid email'),
    ],
    createCustomer
  );

router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

export default router;
