/**
 * Self-check for OpenAPI path normalize + compare.
 * Run: npx tsx backend/src/services/guardian/compare.check.ts
 */
import assert from 'node:assert/strict';
import { normalizePath, parseOpenApiDocument } from './parseOpenApi.js';
import { compareSpecToCode } from './compare.js';

assert.equal(normalizePath('/users/{id}'), '/users/:id');
assert.equal(normalizePath('users/:id/'), '/users/:id');

const spec = parseOpenApiDocument({
  openapi: '3.0.0',
  paths: {
    '/users': {
      get: {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { id: { type: 'string' }, email: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'created' } },
      },
    },
    '/users/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
});

assert.equal(spec.length, 3);

const findings = compareSpecToCode({
  spec,
  code: [
    { method: 'GET', path: '/users', file: 'routes/users.ts' },
    { method: 'POST', path: '/users', file: 'routes/users.ts' },
  ],
  sources: new Map([
    [
      'routes/users.ts',
      `router.get('/users', list);
       router.post('/users', (req, res) => { const email = req.body.email; res.json({ ok: true }); });`,
    ],
  ]),
});

assert.ok(findings.some((f) => f.kind === 'missing-endpoint' && f.severity === 'critical'));
assert.ok(findings.some((f) => f.endpoint?.includes('GET /users/{id}')));

console.log('guardian.compare.check: ok', { findings: findings.length });
