import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

// Determine log directory (use local directory for dev/test to avoid permissions issues on Windows)
const logDir = env.NODE_ENV === 'production' 
  ? '/var/log/gatepass' 
  : path.join(process.cwd(), 'logs');

// Create the directory if it doesn't exist
if (!fs.existsSync(logDir) && env.NODE_ENV !== 'production') {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'gatepass-api',
    environment: env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
});
