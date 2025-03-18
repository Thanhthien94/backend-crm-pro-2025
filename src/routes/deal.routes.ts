import express from 'express';
import { body } from 'express-validator';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  addActivity,
} from '../controllers/deal.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDeals)
  .post(
    [
      body('title').notEmpty().withMessage('Deal title is required'),
      body('customer').notEmpty().withMessage('Customer is required'),
    ],
    createDeal
  );

router.route('/:id').get(getDeal).put(updateDeal).delete(deleteDeal);

router.route('/:id/activities').post(addActivity);

export default router;
