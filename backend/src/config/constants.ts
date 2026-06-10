/**
 * System-wide Constants and Configuration Limits
 */

export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  MFA_TOKEN_WINDOW: 1, // time step window for totp verification
  SLIDING_WINDOW_RATE_LIMIT_MS: 15 * 60 * 1000, // 15 minutes
  SLIDING_WINDOW_MAX_REQUESTS: 100, // max 100 requests per window
};

export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ],
};

export const VALIDATION_RULES = {
  // E.164 format: +[country code][number], total 10 to 15 digits
  PHONE_REGEX: /^\+[1-9]\d{1,14}$/,
  
  // Standard university domain (can be configured or customized)
  UNIVERSITY_EMAIL_DOMAINS: ['university.edu'],
  
  // Pass prefix for human-readable numbers
  PASS_NUMBER_PREFIX: 'GP',
};

export const PASS_EXPIRY_WINDOWS = {
  VISITOR_DEFAULT_HOURS: 8,
  HOSTEL_GUEST_MAX_NIGHTS: 15,
};

export const CORE_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  UNIVERSITY_ADMIN: 'UNIVERSITY_ADMIN',
  SECURITY_ADMIN: 'SECURITY_ADMIN',
  HOSTEL_WARDEN: 'HOSTEL_WARDEN',
  SECURITY_GUARD: 'SECURITY_GUARD',
  STAFF: 'STAFF',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
  VISITOR: 'VISITOR',
} as const;
