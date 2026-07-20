import { randomUUID } from 'node:crypto';
import type { ApiEndpoint, GuardianFinding } from '@devguardian/shared';
import { normalizePath } from './parseOpenApi.js';
import type { ClientApiCall } from './extractClientCalls.js';
import { summarizeFindings } from './compare.js';

function finding(partial: Omit<GuardianFinding, 'id'>): GuardianFinding {
  return { id: randomUUID(), ...partial };
}

function key(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

/**
 * Compare frontend HTTP calls to backend routes (no Swagger required).
 */
export function compareClientsToCode(input: {
  clients: ClientApiCall[];
  code: ApiEndpoint[];
}): GuardianFinding[] {
  const findings: GuardianFinding[] = [];
  const codeByKey = new Map<string, ApiEndpoint>();
  const codeByPath = new Map<string, ApiEndpoint[]>();

  for (const ep of input.code) {
    const path = normalizePath(ep.path);
    const k = key(ep.method, path);
    codeByKey.set(k, { ...ep, path });
    const list = codeByPath.get(path) ?? [];
    list.push({ ...ep, path });
    codeByPath.set(path, list);
  }

  const matchedKeys = new Set<string>();

  for (const call of input.clients) {
    const path = normalizePath(call.path);
    const k = key(call.method, path);
    const label = `${call.method} ${path}`;
    const exact = codeByKey.get(k);

    if (exact) {
      matchedKeys.add(k);
      continue;
    }

    const samePath = codeByPath.get(path) ?? [];
    if (samePath.length > 0) {
      findings.push(
        finding({
          kind: 'method-mismatch',
          severity: 'high',
          title: `Frontend method mismatch: ${label}`,
          description: `Frontend calls ${call.method} ${path} (in ${call.file ?? 'client'}), but backend exposes ${samePath.map((e) => e.method).join(', ')} on that path.`,
          suggestedFix: `Align the frontend call with the backend method, or add ${call.method} ${path} on the server.`,
          affectedFiles: [
            ...(call.file ? [call.file] : []),
            ...samePath.map((e) => e.file).filter(Boolean),
          ] as string[],
          endpoint: label,
        }),
      );
      continue;
    }

    findings.push(
      finding({
        kind: 'missing-endpoint',
        severity: 'critical',
        title: `Frontend calls missing backend route: ${label}`,
        description: `Client code calls ${label}, but no matching route was found in scanned backend routers/controllers.`,
        suggestedFix: `Implement ${label} on the backend, or fix the frontend URL/method.`,
        affectedFiles: call.file ? [call.file] : [],
        endpoint: label,
      }),
    );
  }

  for (const ep of input.code) {
    const k = key(ep.method, ep.path);
    if (matchedKeys.has(k)) continue;
    // Skip if already flagged via method-mismatch for this path
    const clientHitPath = input.clients.some(
      (c) => normalizePath(c.path) === normalizePath(ep.path),
    );
    if (clientHitPath) continue;

    findings.push(
      finding({
        kind: 'undocumented-endpoint',
        severity: 'low',
        title: `Backend route unused by scanned frontend: ${ep.method} ${ep.path}`,
        description:
          'Route exists in backend but no matching fetch/axios/api.* call was found in client sources. May be unused, external-only, or dynamically built.',
        suggestedFix:
          'Confirm whether this API is still needed, document it, or add a client call if the UI should use it.',
        affectedFiles: ep.file ? [ep.file] : [],
        endpoint: `${ep.method} ${ep.path}`,
      }),
    );
  }

  return findings.sort(
    (a, b) =>
      severityOrder(a.severity) - severityOrder(b.severity) || a.title.localeCompare(b.title),
  );
}

function severityOrder(s: GuardianFinding['severity']): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s];
}

export { summarizeFindings };
