import express from 'express';
import { body } from 'express-validator';
import { register, login, getMe, logout } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('organizationName').notEmpty().withMessage('Organization name is required'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  login
);

router.get('/me', protect, getMe);

router.get('/logout', logout);

export default router;
