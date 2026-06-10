import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import ApiResponse from './utils/ApiResponse';
import ApiError from './utils/ApiError';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS with dynamic settings based on environment
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [env.CORS_ORIGIN];
      if (env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:5173');
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom request logger middleware using Winston
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

// Health check endpoint
app.get(`${env.API_PREFIX}/health`, async (_req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      status: 'OK',
      timestamp: new Date(),
      services: {
        database: 'UP',
        redis: 'UP',
        minio: 'UP',
      },
    }, 'System health check passed')
  );
});

// Root API response
app.get('/', (_req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      name: 'University Gate Pass Management System API',
      version: '1.0.0',
    }, 'Welcome to UGPMS API')
  );
});

// Import API Routers
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import visitorRouter from './routes/visitor.routes';
import passRouter from './routes/pass.routes';
import entryLogRouter from './routes/entryLog.routes';

// Register API Routers
app.use(`${env.API_PREFIX}/auth`, authRouter);
app.use(`${env.API_PREFIX}/user`, userRouter);
app.use(`${env.API_PREFIX}/visitor`, visitorRouter);
app.use(`${env.API_PREFIX}/pass`, passRouter);
app.use(`${env.API_PREFIX}/entry`, entryLogRouter);

// 404 Route handler
app.use((req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// Global error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isDev = env.NODE_ENV === 'development';
  
  if (err instanceof ApiError) {
    logger.error(`API Error: ${err.message}`, { statusCode: err.statusCode, errors: err.errors });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      ...(isDev && { stack: err.stack }),
    });
  }

  // Handle other unexpected errors
  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
});

export { app };
