import { createApp } from './app.js';
import { connectMongo, disconnectMongo } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

await connectMongo();

const server = app.listen(env.PORT, () => {
  logger.info(`DevGuardian backend listening on http://localhost:${env.PORT}/api`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down.`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  });
}
