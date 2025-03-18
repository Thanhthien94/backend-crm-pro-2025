import express from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  updatePassword,
} from '../controllers/user.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

// Current user routes
router.route('/profile').put(updateProfile);

router
  .route('/updatepassword')
  .put(
    [
      body('currentPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    ],
    updatePassword
  );

// Admin-only routes
router.use(authorize('admin', 'superadmin'));

router
  .route('/')
  .get(getUsers)
  .post(
    [
      body('name').notEmpty().withMessage('Name is required'),
      body('email').isEmail().withMessage('Please include a valid email'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('role').isIn(['user', 'admin']).withMessage('Role must be either user or admin'),
    ],
    createUser
  );

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

export default router;
