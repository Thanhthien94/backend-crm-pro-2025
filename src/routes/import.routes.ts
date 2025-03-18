import express from 'express';
import { importCustomers, upload } from '../controllers/import.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.route('/customers').post(upload, importCustomers);

export default router;
