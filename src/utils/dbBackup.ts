import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger';

const backupDirectory = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDirectory)) {
  fs.mkdirSync(backupDirectory, { recursive: true });
}

export const createBackup = () => {
  // Create timestamp for filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.gz`;
  const filePath = path.join(backupDirectory, filename);

  // Get MongoDB URI from env
  const mongoUri = process.env.MONGO_URI || '';
  const dbName = mongoUri.split('/').pop();

  // mongodump command
  const command = `mongodump --uri="${mongoUri}" --archive="${filePath}" --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Backup error: ${error.message}`);
      return;
    }

    if (stderr) {
      logger.info(`Backup stderr: ${stderr}`);
    }

    logger.info(`Backup created successfully at ${filePath}`);

    // Clean up old backups (keep last 5)
    cleanupOldBackups();
  });
};

const cleanupOldBackups = () => {
  fs.readdir(backupDirectory, (err, files) => {
    if (err) {
      logger.error(`Error reading backup directory: ${err.message}`);
      return;
    }

    // Sort files by creation time (oldest first)
    files = files
      .filter((file) => file.startsWith('backup-'))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(backupDirectory, file)).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time)
      .map((file) => file.name);

    // Delete all but the 5 most recent backups
    if (files.length > 5) {
      const filesToDelete = files.slice(0, files.length - 5);

      filesToDelete.forEach((file) => {
        fs.unlink(path.join(backupDirectory, file), (err) => {
          if (err) {
            logger.error(`Error deleting backup ${file}: ${err.message}`);
          } else {
            logger.info(`Deleted old backup: ${file}`);
          }
        });
      });
    }
  });
};

// Schedule daily backup
export const scheduleBackups = () => {
  // Run once at startup
  createBackup();

  // Then schedule daily at 2am
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      createBackup();
    }
  }, 60 * 1000); // Check every minute
};
