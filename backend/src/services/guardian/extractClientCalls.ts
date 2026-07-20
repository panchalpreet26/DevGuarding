import type { ApiEndpoint } from '@devguardian/shared';
import { normalizePath } from './parseOpenApi.js';

export type ClientApiCall = ApiEndpoint & {
  rawUrl: string;
};

/** Paths that look like frontend / client code (not backend routers). */
export function isLikelyClientPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (/(^|\/)(routes?|routers?|controllers?)(\/|$)|route\.|controller\./i.test(lower)) {
    return false;
  }
  return (
    /(^|\/)(frontend|client|web|ui|app)(\/|$)/i.test(lower) ||
    /(^|\/)src\/(pages|components|services|hooks|api|lib|features)(\/|$)/i.test(lower) ||
    /\.(tsx|jsx)$/i.test(lower)
  );
}

function stripUrlToPath(url: string): string | null {
  let cleaned = url.trim();
  if (!cleaned || cleaned.includes('${')) return null;

  try {
    if (/^https?:\/\//i.test(cleaned)) {
      cleaned = new URL(cleaned).pathname;
    }
  } catch {
    return null;
  }

  cleaned = cleaned.split('?')[0]?.split('#')[0] ?? cleaned;
  if (!cleaned.startsWith('/')) return null;
  // Skip obvious non-API assets
  if (/\.(png|jpe?g|svg|css|ico|woff2?|map)$/i.test(cleaned)) return null;
  return normalizePath(cleaned);
}

function pushUnique(list: ClientApiCall[], call: ClientApiCall): void {
  const key = `${call.method} ${call.path} ${call.file ?? ''}`;
  if (list.some((c) => `${c.method} ${c.path} ${c.file ?? ''}` === key)) return;
  list.push(call);
}

/**
 * Extract HTTP calls from frontend-ish sources (fetch / axios / api.get).
 * Used when no Swagger is available — compare client expectations vs backend routes.
 */
export function extractClientCalls(files: Map<string, string>): ClientApiCall[] {
  const calls: ClientApiCall[] = [];

  for (const [file, content] of files) {
    if (!isLikelyClientPath(file)) continue;

    // fetch('/api/x', { method: 'POST' }) or fetch('/api/x')
    const fetchRe =
      /fetch\s*\(\s*[`'"]([^`'"]+)[`'"](?:\s*,\s*\{([\s\S]*?)\})?/gi;
    let match: RegExpExecArray | null;
    while ((match = fetchRe.exec(content)) !== null) {
      const path = stripUrlToPath(match[1]!);
      if (!path) continue;
      const opts = match[2] ?? '';
      const methodMatch = opts.match(/method\s*:\s*['"`](\w+)['"`]/i);
      pushUnique(calls, {
        method: (methodMatch?.[1] ?? 'GET').toUpperCase(),
        path,
        rawUrl: match[1]!,
        file,
      });
    }

    // axios.get/post('/path')
    const axiosMethodRe =
      /axios\.(get|post|put|patch|delete|options|head)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;
    while ((match = axiosMethodRe.exec(content)) !== null) {
      const path = stripUrlToPath(match[2]!);
      if (!path) continue;
      pushUnique(calls, {
        method: match[1]!.toUpperCase(),
        path,
        rawUrl: match[2]!,
        file,
      });
    }

    // api.get('/path') / client.post("/x") — common wrappers
    const wrapperRe =
      /\b(?:api|client|http)\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;
    while ((match = wrapperRe.exec(content)) !== null) {
      const path = stripUrlToPath(match[2]!);
      if (!path) continue;
      pushUnique(calls, {
        method: match[1]!.toUpperCase(),
        path,
        rawUrl: match[2]!,
        file,
      });
    }
  }

  return calls.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}
