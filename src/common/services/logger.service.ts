import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        ({
          timestamp,
          level,
          message,
        }: {
          timestamp: string;
          level: string;
          message: string;
        }) => {
          return `${String(timestamp)} ${String(level)}: ${String(message)}`;
        },
      ),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  });

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${String(timestamp)} ${level}: ${String(message as string)}`;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(this.formatMessage(message, context));
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(this.formatMessage(message, context), { trace });
  }

  warn(message: any, context?: string) {
    this.logger.warn(this.formatMessage(message, context));
  }

  debug(message: any, context?: string) {
    this.logger.debug(this.formatMessage(message, context));
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(this.formatMessage(message, context));
  }

  private formatMessage(message: any, context?: string): string {
    return context ? `[${context}] ${String(message)}` : String(message);
  }
}
