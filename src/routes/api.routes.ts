import express from 'express';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
} from '../controllers/deal.controller';

const router = express.Router();

// Use API key authentication for all routes
router.use(authenticateApiKey);

// Customer routes
router.route('/customers').get(getCustomers).post(createCustomer);

router.route('/customers/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

// Deal routes
router.route('/deals').get(getDeals).post(createDeal);

router.route('/deals/:id').get(getDeal).put(updateDeal).delete(deleteDeal);

export default router;
