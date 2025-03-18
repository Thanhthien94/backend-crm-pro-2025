import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse';
import Customer from '../models/Customer';
import { AppError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Filter file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only CSV files
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed!'));
  }
};

// Init upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB max
}).single('file');

// @desc    Import customers from CSV
// @route   POST /api/v1/imports/customers
// @access  Private
export const importCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a CSV file', 400));
    }

    const filePath = req.file.path;
    const organizationId = req.user.organization;

    // Read CSV file
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

    // Parse CSV
    parse(
      fileContent,
      {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      },
      async (err, records: any[]) => {
        if (err) {
          fs.unlinkSync(filePath); // Clean up file
          return next(new AppError(`Error parsing CSV: ${err.message}`, 400));
        }

        if (records.length === 0) {
          fs.unlinkSync(filePath); // Clean up file
          return next(new AppError('No records found in CSV', 400));
        }

        // Validate required columns
        if (!records[0].hasOwnProperty('name') || !records[0].hasOwnProperty('email')) {
          fs.unlinkSync(filePath); // Clean up file
          return next(new AppError('CSV must contain name and email columns', 400));
        }

        // Process records
        const results = {
          total: records.length,
          imported: 0,
          skipped: 0,
          errors: [] as string[],
        };

        // Process in batches to avoid overwhelming the database
        const batchSize = 100;
        const batches = [];

        for (let i = 0; i < records.length; i += batchSize) {
          batches.push(records.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const customersToInsert = [];

          for (const record of batch) {
            try {
              // Basic validation
              if (!record.name || !record.email) {
                results.errors.push(
                  `Row skipped: Missing name or email for entry: ${
                    record.email || record.name || 'unknown'
                  }`
                );
                results.skipped++;
                continue;
              }

              // Prepare customer object
              const customerData: any = {
                name: record.name,
                email: record.email,
                organization: organizationId,
                assignedTo: req.user.id, // Default to current user
              };

              // Add optional fields if they exist
              if (record.phone) customerData.phone = record.phone;
              if (record.company) customerData.company = record.company;
              if (
                record.type &&
                ['lead', 'prospect', 'customer', 'churned'].includes(record.type)
              ) {
                customerData.type = record.type;
              }
              if (record.status && ['active', 'inactive'].includes(record.status)) {
                customerData.status = record.status;
              }
              if (record.source) customerData.source = record.source;
              if (record.notes) customerData.notes = record.notes;

              // Extract custom fields - any column that starts with 'custom_'
              const customFields: any = {};
              Object.keys(record).forEach((key) => {
                if (key.startsWith('custom_') && record[key]) {
                  const fieldName = key.replace('custom_', '');
                  customFields[fieldName] = record[key];
                }
              });

              if (Object.keys(customFields).length > 0) {
                customerData.customFields = customFields;
              }

              customersToInsert.push(customerData);
            } catch (error) {
              results.errors.push(
                `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
              results.skipped++;
            }
          }

          // Insert batch
          if (customersToInsert.length > 0) {
            try {
              const insertResult = await Customer.insertMany(customersToInsert, { ordered: false });
              results.imported += insertResult.length;
            } catch (error: any) {
              // Handle duplicate key errors (e.g., email already exists)
              if (error.name === 'BulkWriteError' && error.code === 11000) {
                // Some documents were inserted
                results.imported += error.insertedCount || 0;
                results.skipped += customersToInsert.length - (error.insertedCount || 0);
                results.errors.push(
                  `${error.writeErrors?.length || 0} records skipped due to duplicate emails`
                );
              } else {
                results.skipped += customersToInsert.length;
                results.errors.push(`Batch error: ${error.message}`);
              }
            }
          }
        }

        // Clean up file
        fs.unlinkSync(filePath);

        res.status(200).json({
          success: true,
          data: results,
        });
      }
    );
  } catch (error) {
    // Clean up file if it exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
