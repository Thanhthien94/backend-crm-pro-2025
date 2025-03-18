import express from 'express';
import { body } from 'express-validator';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getRelatedTasks,
} from '../controllers/task.controller';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getTasks)
  .post([body('title').notEmpty().withMessage('Task title is required')], createTask);

router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

router.route('/related/:model/:id').get(getRelatedTasks);

export default router;
