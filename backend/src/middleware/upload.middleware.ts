import multer from 'multer';
import { FILE_UPLOAD_CONFIG } from '../config/constants';
import ApiError from '../utils/ApiError';

const storage = multer.memoryStorage();

/**
 * Multer middleware configured for secure in-memory file uploads
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new ApiError(400, `Invalid file type. Allowed formats: ${FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`));
    }
  },
});

export default upload;
