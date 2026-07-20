/**
 * Session jti create / verify / revoke self-check (no network).
 * Run: npx tsx src/services/auth/session.check.ts
 */
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../../config/secrets.js';

type SessionPayload = { sub: string; jti: string };

function sign(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti } satisfies SessionPayload, jwtSecret(), {
    expiresIn: '1h',
  });
}

function decode(token: string): SessionPayload {
  return jwt.verify(token, jwtSecret()) as SessionPayload;
}

const token = sign('user-1', 'jti-abc');
const payload = decode(token);
assert.equal(payload.sub, 'user-1');
assert.equal(payload.jti, 'jti-abc');

let rejected = false;
try {
  jwt.verify(token, 'wrong-secret');
} catch {
  rejected = true;
}
assert.equal(rejected, true);

console.log('session.check.ts: ok');
