import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from '../utils/logger';

// Determine SMTP credentials
const smtpUser = env.EMAIL_USER || env.SMTP_USER;
const smtpPass = env.EMAIL_PASS || env.SMTP_PASS;

// Create a transporter using SMTP configuration
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: smtpUser && smtpPass 
    ? {
        user: smtpUser,
        pass: smtpPass,
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
