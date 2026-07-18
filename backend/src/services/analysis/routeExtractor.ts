import type { ApiEndpoint } from '@devguardian/shared';

const EXPRESS_ROUTE =
  /\b(?:router|app|Router\(\))\.(get|post|put|patch|delete|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

const NEST_ROUTE =
  /@(Get|Post|Put|Patch|Delete|Options|All)\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/gi;

const FASTIFY_ROUTE =
  /\.(get|post|put|patch|delete|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

function pushUnique(list: ApiEndpoint[], endpoint: ApiEndpoint): void {
  const key = `${endpoint.method} ${endpoint.path} ${endpoint.file ?? ''}`;
  if (list.some((e) => `${e.method} ${e.path} ${e.file ?? ''}` === key)) return;
  list.push(endpoint);
}

/** Extract HTTP endpoints from route/controller source files. */
export function extractEndpoints(files: Map<string, string>): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  for (const [file, content] of files) {
    EXPRESS_ROUTE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = EXPRESS_ROUTE.exec(content)) !== null) {
      pushUnique(endpoints, {
        method: normalizeMethod(match[1]!),
        path: match[2]!,
        file,
      });
    }

    NEST_ROUTE.lastIndex = 0;
    while ((match = NEST_ROUTE.exec(content)) !== null) {
      pushUnique(endpoints, {
        method: normalizeMethod(match[1]!),
        path: match[2] || '/',
        file,
      });
    }

    // Fastify-style only if we didn't already catch express-like patterns heavily
    if (!/express|Router\(/.test(content) && /fastify|@fastify/.test(content)) {
      FASTIFY_ROUTE.lastIndex = 0;
      while ((match = FASTIFY_ROUTE.exec(content)) !== null) {
        pushUnique(endpoints, {
          method: normalizeMethod(match[1]!),
          path: match[2]!,
          file,
        });
      }
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
