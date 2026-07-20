import { createApp } from './app.js';
import { connectMongo, disconnectMongo, isMongoConnected } from './config/db.js';
import { env, isProd } from './config/env.js';
import { assertBootSecrets } from './config/secrets.js';
import { logger } from './utils/logger.js';

assertBootSecrets();

const app = createApp();

await connectMongo();

if (isProd && !isMongoConnected()) {
  logger.error('MongoDB is required in production for auth sessions. Refusing to start.');
  process.exit(1);
}

const server = app.listen(env.PORT, () => {
  logger.info(`DevGuardian backend listening on http://localhost:${env.PORT}/api`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use. Stop the other process, then retry.`, {
      hint: `Windows: Get-NetTCPConnection -LocalPort ${env.PORT} | Select OwningProcess`,
    });
    process.exit(1);
  }
  throw err;
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
