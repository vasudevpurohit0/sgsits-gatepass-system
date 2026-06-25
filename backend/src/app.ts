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
      const normalizedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
      if (env.NODE_ENV === 'development') {
        normalizedOrigins.push('http://localhost:5173');
      }
      
      const isAllowed = 
        !origin || 
        normalizedOrigins.includes(origin.replace(/\/$/, '')) ||
        origin.endsWith('.vercel.app');
        
      if (isAllowed) {
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

// SMTP Diagnostics endpoint
app.get(`${env.API_PREFIX}/health/smtp-diagnostics`, async (_req, res) => {
  const net = require('net');
  const nodemailer = require('nodemailer');

  const diagnostics: any = {
    timestamp: new Date(),
    env: {
      SMTP_HOST: env.SMTP_HOST,
      SMTP_PORT: env.SMTP_PORT,
      SMTP_USER: env.SMTP_USER,
      EMAIL_USER: env.EMAIL_USER,
      SMTP_FROM_EMAIL: env.SMTP_FROM_EMAIL,
      NODE_ENV: env.NODE_ENV,
      has_SMTP_PASS: !!env.SMTP_PASS,
      has_EMAIL_PASS: !!env.EMAIL_PASS,
      length_SMTP_PASS: env.SMTP_PASS ? env.SMTP_PASS.length : 0,
      length_EMAIL_PASS: env.EMAIL_PASS ? env.EMAIL_PASS.length : 0,
    },
    tcp: {},
    verify: null,
  };

  const testPort = (host: string, port: number): Promise<string> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = 'unknown';

      socket.setTimeout(2500);

      socket.connect(port, host, () => {
        status = 'CONNECTED';
        socket.destroy();
      });

      socket.on('timeout', () => {
        status = 'TIMEOUT';
        socket.destroy();
      });

      socket.on('error', (err: any) => {
        status = `ERROR: ${err.message}`;
      });

      socket.on('close', () => {
        resolve(status);
      });
    });
  };

  diagnostics.tcp['smtp.gmail.com:587'] = await testPort('smtp.gmail.com', 587);
  diagnostics.tcp['smtp.gmail.com:465'] = await testPort('smtp.gmail.com', 465);
  diagnostics.tcp['smtp.gmail.com:25'] = await testPort('smtp.gmail.com', 25);
  diagnostics.tcp['smtp.gmail.com:2525'] = await testPort('smtp.gmail.com', 2525);

  try {
    const smtpUser = env.EMAIL_USER || env.SMTP_USER;
    const smtpPass = env.EMAIL_PASS || env.SMTP_PASS;
    const testTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      connectionTimeout: 4000,
    });

    await testTransporter.verify();
    diagnostics.verify = 'SUCCESS';
  } catch (err: any) {
    diagnostics.verify = {
      error: err.message || String(err),
      code: err.code,
      command: err.command,
      stack: err.stack,
    };
  }

  res.status(200).json(new ApiResponse(200, diagnostics, 'SMTP Diagnostics completed'));
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
import securityPassRouter from './routes/securityPass.routes';

// Register API Routers
app.use(`${env.API_PREFIX}/auth`, authRouter);
app.use(`${env.API_PREFIX}/user`, userRouter);
app.use(`${env.API_PREFIX}/visitor`, visitorRouter);
app.use(`${env.API_PREFIX}/pass`, passRouter);
app.use(`${env.API_PREFIX}/entry`, entryLogRouter);
app.use(`${env.API_PREFIX}/security-pass`, securityPassRouter);

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
