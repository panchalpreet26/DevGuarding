import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { attachUser } from './middleware/auth.js';
import { bindGithubToken } from './middleware/githubContext.js';
import { env } from './config/env.js';

/** Build and configure the Express app (no listen — kept testable). */
export function createApp(): Express {
  const app = express();

  // Needed behind Render / Railway / Vercel proxies for correct HTTPS cookie handling.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use(bindGithubToken);

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
