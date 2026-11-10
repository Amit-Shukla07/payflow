import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { settlementWorker } from './services/settlement.worker.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    // 1. Connect to Database
    await connectDatabase(env.MONGODB_URI);

    // 2. Start Settlement Worker for PayFlow Undo auto-settlement
    settlementWorker.start(1000);

    // 3. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`PayFlow Banking Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // 4. Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      settlementWorker.stop();
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force exit if not finished within 10 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start PayFlow server:', error);
    process.exit(1);
  }
}

bootstrap();

