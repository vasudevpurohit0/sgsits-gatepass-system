import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { initMinio } from './config/minio';
import { initMailer } from './config/mailer';
import { initScheduler } from './jobs/scheduler';
import { socketService } from './services/socket.service';

const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:5173'];
      const normalizedOrigins = allowedOrigins.map(o => o ? o.replace(/\/$/, '') : '');
      
      const isAllowed = 
        !origin || 
        normalizedOrigins.includes(origin.replace(/\/$/, '')) ||
        origin.endsWith('.vercel.app');
        
      if (isAllowed) {
        callback(null, origin);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket manager singleton
socketService.init(io);

io.on('connection', (socket) => {
  logger.info(`🔌 Socket client connected: ${socket.id}`);
  
  // Custom room joining for user roles
  socket.on('join', (data: { role?: string; userId?: string }) => {
    if (data.role) {
      socket.join(`role:${data.role}`);
      logger.info(`🔌 Socket client ${socket.id} joined role room: role:${data.role}`);
    }
    if (data.userId) {
      socket.join(`user:${data.userId}`);
      logger.info(`🔌 Socket client ${socket.id} joined user room: user:${data.userId}`);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`🔌 Socket client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    logger.info('Starting server initialization...');

    // 1. Verify Database Connection
    await prisma.$connect();
    logger.info('🐘 PostgreSQL database connection established');

    // 2. Initialize MinIO
    await initMinio();

    // 3. Initialize Mailer
    await initMailer();

    // 4. Start background cron jobs
    initScheduler();

    // 5. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`API Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down server gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Disconnect Prisma
      await prisma.$disconnect();
      logger.info('Prisma database client disconnected.');
      
      // Disconnect Redis
      await redis.quit();
      logger.info('Redis client disconnected.');
      
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Timeout shutdown after 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { io };
