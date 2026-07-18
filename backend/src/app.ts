import express, { type Express } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { env } from './config/env.js';

/** Build and configure the Express app (no listen — kept testable). */
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
