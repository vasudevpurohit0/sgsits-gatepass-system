import * as Minio from 'minio';
import { env } from './env';
import { logger } from '../utils/logger';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

/**
 * Initialize MinIO bucket if it does not already exist
 */
export const initMinio = async (): Promise<void> => {
  try {
    const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(env.MINIO_BUCKET, 'us-east-1');
      logger.info(`🪣 Created MinIO bucket: ${env.MINIO_BUCKET}`);
    } else {
      logger.info(`🪣 MinIO bucket "${env.MINIO_BUCKET}" verified`);
    }
  } catch (error) {
    logger.error('❌ Failed to initialize MinIO:', error);
  }
};
