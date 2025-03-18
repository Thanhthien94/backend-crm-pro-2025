import app from './app';
import connectDB from './config/db';
import logger from './config/logger';
import { scheduleBackups } from './utils/dbBackup';

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

if (process.env.NODE_ENV === 'production') {
  scheduleBackups();
}

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
