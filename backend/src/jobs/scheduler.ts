import cron from 'node-cron';
import expirePassJob from './expirePass.job';
import overstayAlertJob from './overstayAlert.job';
import { logger } from '../utils/logger';

export const initScheduler = () => {
  logger.info('⏰ Initializing background scheduler jobs...');

  // Every minute: expire passes past validTo
  cron.schedule('* * * * *', async () => {
    logger.info('⏰ Triggered expirePassJob');
    await expirePassJob();
  });

  // Every 5 minutes: check for overstays
  cron.schedule('*/5 * * * *', async () => {
    logger.info('⏰ Triggered overstayAlertJob');
    await overstayAlertJob();
  });
};

export default initScheduler;
