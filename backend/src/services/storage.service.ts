import { minioClient } from '../config/minio';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import ApiError from '../utils/ApiError';

export class StorageService {
  private bucket: string;

  constructor() {
    this.bucket = env.MINIO_BUCKET;
  }

  /**
   * Upload raw buffer to MinIO bucket with optional SSE-S3 encryption
   */
  async uploadFile(
    objectName: string, 
    buffer: Buffer, 
    mimeType: string, 
    _isSecure = false
  ): Promise<string> {
    try {
      const metaData: Record<string, string> = {
        'Content-Type': mimeType,
      };

      // SSE-S3 encryption is disabled because MinIO containers (such as the one deployed on Railway)
      // do not have KMS configured. Attempting to set 'x-amz-server-side-encryption' returns a 500 S3Error.

      await minioClient.putObject(this.bucket, objectName, buffer, buffer.length, metaData);
      logger.info(`📁 Uploaded file "${objectName}" to bucket "${this.bucket}"`);
      return objectName;
    } catch (error: any) {
      logger.error(`❌ MinIO upload failed for "${objectName}":`, error);
      throw new ApiError(500, `Storage upload failed: ${error.message}`);
    }
  }

  /**
   * Generate a presigned temporary URL for downloading private assets
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 300): Promise<string> {
    try {
      const url = await minioClient.presignedGetObject(this.bucket, objectName, expirySeconds);
      return url;
    } catch (error: any) {
      logger.error(`❌ MinIO url generation failed for "${objectName}":`, error);
      throw new ApiError(500, `Could not retrieve file access url: ${error.message}`);
    }
  }

  /**
   * Fetch a file from MinIO as a Buffer
   */
  async getFileBuffer(objectName: string): Promise<Buffer> {
    try {
      const stream = await minioClient.getObject(this.bucket, objectName);
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error: any) {
      logger.error(`❌ MinIO getObject failed for "${objectName}":`, error);
      throw new ApiError(500, `Storage fetch failed: ${error.message}`);
    }
  }

  /**
   * Delete an object from MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await minioClient.removeObject(this.bucket, objectName);
      logger.info(`📁 Deleted file "${objectName}" from bucket "${this.bucket}"`);
    } catch (error: any) {
      logger.error(`❌ MinIO deletion failed for "${objectName}":`, error);
      throw new ApiError(500, `Storage deletion failed: ${error.message}`);
    }
  }
}

export default StorageService;
