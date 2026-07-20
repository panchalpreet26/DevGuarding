/**
 * Client-call extractor self-check.
 * Run: npx tsx src/services/guardian/extractClientCalls.check.ts
 */
import assert from 'node:assert/strict';
import { extractClientCalls } from './extractClientCalls.js';

const files = new Map<string, string>([
  [
    'frontend/src/services/api.ts',
    `
      await fetch('/api/users', { method: 'POST' });
      await api.get('/api/repos');
      await axios.post('/api/login', {});
    `,
  ],
  [
    'backend/src/routes/users.ts',
    `router.get('/api/users', handler);`,
  ],
]);

const calls = extractClientCalls(files);
assert.ok(calls.some((c) => c.method === 'POST' && c.path === '/api/users'));
assert.ok(calls.some((c) => c.method === 'GET' && c.path === '/api/repos'));
assert.ok(calls.some((c) => c.method === 'POST' && c.path === '/api/login'));
assert.equal(
  calls.every((c) => c.file?.startsWith('frontend/')),
  true,
  'backend routes must not be treated as client calls',
);

console.log('extractClientCalls.check.ts: ok');
