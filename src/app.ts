import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { setupSwaggerUI, swaggerAssetsCORS } from './middleware/swaggerUI';

// Load env vars
dotenv.config();

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import customerRoutes from './routes/customer.routes';
import dealRoutes from './routes/deal.routes';
import taskRoutes from './routes/task.routes';
import organizationRoutes from './routes/organization.routes';
import customFieldRoutes from './routes/customField.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import importRoutes from './routes/import.routes';
import webhookRoutes from './routes/webhook.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import apiRoutes from './routes/api.routes';

const app: Application = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Security
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow cross-origin resource sharing
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'], // Frontend URLs
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Swagger assets CORS
app.use(swaggerAssetsCORS);

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/deals', dealRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/organization', organizationRoutes);
app.use('/api/v1/customfields', customFieldRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/apikeys', apiKeyRoutes);
app.use('/api/v1/api', apiRoutes);

// Setup Swagger UI with custom styling
if (process.env.NODE_ENV === 'development') {
  setupSwaggerUI(app);
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

export default app;