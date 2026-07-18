/**
 * Runnable self-check for route extraction.
 * Run: npx tsx src/services/analysis/routeExtractor.check.ts
 */
import { extractEndpoints } from './routeExtractor.js';
import assert from 'node:assert/strict';

const sample = `
import { Router } from 'express';
const router = Router();
router.get('/health', getHealth);
router.post('/analysis', runAnalysis);
app.delete('/users/:id', removeUser);
`;

const endpoints = extractEndpoints(new Map([['routes/index.ts', sample]]));

assert.equal(endpoints.length, 3, 'expected 3 express routes');
assert.ok(endpoints.some((e) => e.method === 'GET' && e.path === '/health'));
assert.ok(endpoints.some((e) => e.method === 'POST' && e.path === '/analysis'));
assert.ok(endpoints.some((e) => e.method === 'DELETE' && e.path === '/users/:id'));

console.log('routeExtractor.check: ok');
