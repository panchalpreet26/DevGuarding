/**
 * Runnable self-check for unknown-answer detection heuristic.
 * Run: npx tsx backend/src/services/ai/chatService.check.ts
 */
import assert from 'node:assert/strict';

function looksUnknown(answer: string): boolean {
  return /^i don't know this yet/i.test(answer.trim());
}

assert.equal(looksUnknown("I don't know this yet. Missing auth files."), true);
assert.equal(looksUnknown('Authentication lives in middleware/auth.ts'), false);

console.log('chatService.check: ok');
