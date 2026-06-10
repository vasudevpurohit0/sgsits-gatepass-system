import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from '../utils/logger';

// Create a transporter using SMTP configuration
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: env.SMTP_USER && env.SMTP_PASS 
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      }
    : undefined,
});

/**
 * Verify SMTP transporter connection
 */
export const initMailer = async (): Promise<void> => {
  try {
    await mailer.verify();
    logger.info('📧 Mailer transport verified successfully');
  } catch (error) {
    logger.error('❌ Mailer transport verification failed:', error);
  }
};
