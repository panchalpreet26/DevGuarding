/**
 * Minimal structured logger. Swap for pino/winston later if needed.
 * ponytail: stdout logging is enough for an MVP; upgrade to pino when we need log levels + transports.
 */
type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, message: string, meta?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};
