/** API Guardian: diff between OpenAPI/Swagger and repository routes. */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FindingKind =
  | 'missing-endpoint'
  | 'undocumented-endpoint'
  | 'method-mismatch'
  | 'missing-field'
  | 'wrong-field-name'
  | 'wrong-response-type'
  | 'missing-validation'
  | 'breaking-change';

export interface GuardianFinding {
  id: string;
  kind: FindingKind;
  severity: Severity;
  title: string;
  description: string;
  suggestedFix: string;
  affectedFiles: string[];
  /** Spec path+method when relevant, e.g. "GET /users/{id}". */
  endpoint?: string;
}

export interface SpecEndpointSummary {
  method: string;
  path: string;
  requestFields: string[];
  responseFields: string[];
}

export interface GuardianReportSummary {
  high: number;
  medium: number;
  low: number;
  critical: number;
  specEndpoints: number;
  codeEndpoints: number;
  matched: number;
}

export interface GuardianReport {
  repoFullName: string;
  findings: GuardianFinding[];
  summary: GuardianReportSummary;
  specEndpoints: SpecEndpointSummary[];
  codeEndpoints: Array<{ method: string; path: string; file?: string }>;
  checkedAt: string;
}

export interface GuardianCompareRequest {
  repoFullName: string;
  /** Raw OpenAPI/Swagger JSON object or stringified JSON. */
  swagger: unknown;
}
