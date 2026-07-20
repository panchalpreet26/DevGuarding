import type { ApiEndpoint } from '@devguardian/shared';
import { normalizePath } from './parseOpenApi.js';

/**
 * Build a minimal OpenAPI 3 draft from extracted backend routes.
 * Useful when the repo has no swagger.json yet — download, edit, then re-run Guardian.
 */
export function buildDraftOpenApi(input: {
  repoFullName: string;
  endpoints: ApiEndpoint[];
}): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of input.endpoints) {
    const openApiPath = toOpenApiPath(normalizePath(ep.path));
    const method = ep.method.toLowerCase();
    if (!paths[openApiPath]) paths[openApiPath] = {};
    paths[openApiPath]![method] = {
      summary: `${ep.method} ${ep.path}`,
      operationId: `${method}_${openApiPath.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
      responses: {
        '200': { description: 'OK (draft — fill in response schema)' },
      },
      ...(ep.file ? { 'x-source-file': ep.file } : {}),
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${input.repoFullName} API (draft)`,
      version: '0.0.0-draft',
      description:
        'Auto-generated from repository routes by DevGuardian. Review paths, add schemas, then upload to API Guardian for contract checks.',
    },
    paths,
  };
}

function toOpenApiPath(expressPath: string): string {
  return (
    '/' +
    expressPath
      .split('/')
      .filter(Boolean)
      .map((seg) => (seg.startsWith(':') ? `{${seg.slice(1)}}` : seg))
      .join('/')
  ).replace(/\/+/g, '/') || '/';
}
