import { randomUUID } from 'node:crypto';
import type { ApiEndpoint, GuardianFinding, Severity } from '@devguardian/shared';
import { normalizePath, type SpecEndpoint } from './parseOpenApi.js';

function finding(
  partial: Omit<GuardianFinding, 'id'>,
): GuardianFinding {
  return { id: randomUUID(), ...partial };
}

function endpointKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

function pathOnlyMatches(specPath: string, codePath: string): boolean {
  return normalizePath(specPath) === normalizePath(codePath);
}

/** Heuristic: does source mention a field name in body/validation context? */
export function fieldMentionedInSource(source: string, field: string): boolean {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`['"\`]${escaped}['"\`]\\s*:`, 'i'),
    new RegExp(`\\b${escaped}\\b\\s*:`, 'i'),
    new RegExp(`(body|req\\.body|params|query|dto|schema)\\.[\\w.]*${escaped}\\b`, 'i'),
    new RegExp(`['"\`]${escaped}['"\`]\\s*,`, 'i'),
    new RegExp(`z\\.object\\([\\s\\S]*?${escaped}`, 'i'),
    new RegExp(`Joi\\.object\\([\\s\\S]*?${escaped}`, 'i'),
    new RegExp(`check\\(['"\`]${escaped}['"\`]`, 'i'),
    new RegExp(`body\\(['"\`]${escaped}['"\`]`, 'i'),
  ];
  return patterns.some((re) => re.test(source));
}

export function hasValidationLibrary(source: string): boolean {
  return /zod|joi|yup|express-validator|class-validator|ajv|celebrate/i.test(source);
}

/**
 * Compare OpenAPI endpoints against code routes and optional source contents.
 */
export function compareSpecToCode(input: {
  spec: SpecEndpoint[];
  code: ApiEndpoint[];
  sources: Map<string, string>;
}): GuardianFinding[] {
  const findings: GuardianFinding[] = [];
  const codeByKey = new Map<string, ApiEndpoint>();
  const codeByPath = new Map<string, ApiEndpoint[]>();

  for (const ep of input.code) {
    const path = normalizePath(ep.path);
    const key = endpointKey(ep.method, path);
    codeByKey.set(key, { ...ep, path });
    const list = codeByPath.get(path) ?? [];
    list.push({ ...ep, path });
    codeByPath.set(path, list);
  }

  const matchedCodeKeys = new Set<string>();

  for (const spec of input.spec) {
    const key = endpointKey(spec.method, spec.path);
    const label = `${spec.method} ${spec.rawPath}`;
    const exact = codeByKey.get(key);

    if (exact) {
      matchedCodeKeys.add(key);
      const file = exact.file;
      const source = file ? (input.sources.get(file) ?? '') : '';
      const affected = file ? [file] : [];

      // Request fields / validation
      for (const field of spec.requestFields) {
        if (field.location === 'path') continue; // path params implied by route
        const mentioned = source ? fieldMentionedInSource(source, field.name) : false;

        if (field.required && source && !mentioned) {
          findings.push(
            finding({
              kind: 'missing-field',
              severity: 'high',
              title: `Missing request field handling: ${field.name}`,
              description: `${label} requires \`${field.name}\` (${field.location}${field.type ? `, ${field.type}` : ''}) in the spec, but it was not found in the route/controller source.`,
              suggestedFix: `Read and validate \`req.${field.location === 'query' ? 'query' : field.location === 'header' ? 'headers' : 'body'}.${field.name}\` in the handler, or update the OpenAPI spec if the field was removed.`,
              affectedFiles: affected,
              endpoint: label,
            }),
          );
        }
      }

      if (
        spec.requiredRequestFields.length > 0 &&
        source &&
        !hasValidationLibrary(source) &&
        !/required|validate|schema/i.test(source)
      ) {
        findings.push(
          finding({
            kind: 'missing-validation',
            severity: 'medium',
            title: `No validation detected for ${label}`,
            description: `Spec requires fields (${spec.requiredRequestFields.slice(0, 5).join(', ')}), but the handler file shows no obvious validation library or required checks.`,
            suggestedFix:
              'Add zod/joi/express-validator (or equivalent) for required request fields, aligned with the OpenAPI schema.',
            affectedFiles: affected,
            endpoint: label,
          }),
        );
      }

      // Response fields — soft check
      for (const field of spec.responseFields.slice(0, 12)) {
        if (!source) break;
        if (!fieldMentionedInSource(source, field.name)) {
          findings.push(
            finding({
              kind: 'wrong-response-type',
              severity: 'low',
              title: `Response field \`${field.name}\` not seen in handler`,
              description: `${label} documents response field \`${field.name}\`${field.type ? ` (${field.type})` : ''}, but the handler source does not clearly reference it.`,
              suggestedFix: `Ensure the handler returns \`${field.name}\`, or remove it from the OpenAPI response schema.`,
              affectedFiles: affected,
              endpoint: label,
            }),
          );
        }
      }

      continue;
    }

    // Same path, different method?
    const samePath = codeByPath.get(normalizePath(spec.path)) ?? [];
    if (samePath.length > 0) {
      const methods = samePath.map((e) => e.method).join(', ');
      findings.push(
        finding({
          kind: 'method-mismatch',
          severity: 'high',
          title: `Method mismatch for ${spec.path}`,
          description: `Spec declares ${spec.method}, but code exposes ${methods} on the same path.`,
          suggestedFix: `Implement ${spec.method} ${spec.path} in the router, or correct the OpenAPI method.`,
          affectedFiles: samePath.map((e) => e.file).filter(Boolean) as string[],
          endpoint: label,
        }),
      );
      continue;
    }

    // Missing entirely in code
    findings.push(
      finding({
        kind: 'missing-endpoint',
        severity: 'critical',
        title: `Missing endpoint: ${label}`,
        description: `OpenAPI declares ${label}, but no matching route was found in scanned controllers/routes.`,
        suggestedFix: `Add a ${spec.method} handler for \`${spec.path}\` (or adjust the path/method in the spec to match the implementation).`,
        affectedFiles: [],
        endpoint: label,
      }),
    );
  }

  // Undocumented code endpoints
  for (const ep of input.code) {
    const key = endpointKey(ep.method, ep.path);
    if (matchedCodeKeys.has(key)) continue;
    // Skip if matched via method-mismatch path already counted as related
    const specPaths = input.spec.filter((s) => pathOnlyMatches(s.path, ep.path));
    if (specPaths.some((s) => s.method === ep.method.toUpperCase())) continue;

    findings.push(
      finding({
        kind: 'undocumented-endpoint',
        severity: 'medium',
        title: `Undocumented endpoint: ${ep.method} ${ep.path}`,
        description: 'Route exists in code but was not found in the uploaded OpenAPI/Swagger document.',
        suggestedFix: `Document \`${ep.method} ${ep.path}\` in the OpenAPI spec, or remove the unused route.`,
        affectedFiles: ep.file ? [ep.file] : [],
        endpoint: `${ep.method} ${ep.path}`,
      }),
    );
  }

  return sortFindings(findings);
}

const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortFindings(findings: GuardianFinding[]): GuardianFinding[] {
  return [...findings].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.title.localeCompare(b.title),
  );
}

export function summarizeFindings(findings: GuardianFinding[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };
}
