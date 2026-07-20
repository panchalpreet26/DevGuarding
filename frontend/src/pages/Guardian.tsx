import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Download, FileJson2, Loader2, ScanSearch, Upload } from 'lucide-react';
import type { GuardianFinding, GuardianReport, Severity } from '@devguardian/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyFindings, FindingCard } from '@/components/guardian/FindingCard';
import { GuardianSummaryStrip } from '@/components/guardian/GuardianSummaryStrip';
import { Badge } from '@/components/ui/badge';
import { useRepo } from '@/context/RepoContext';
import { ApiRequestError } from '@/services/api';
import {
  compareRepoSpec,
  compareSwagger,
  draftOpenApi,
  scanClients,
} from '@/services/guardian';
import { cn } from '@/lib/utils';

type FilterSeverity = 'all' | Severity;
type Mode = 'swagger' | 'clients';

export default function GuardianPage() {
  const { activeRepo } = useRepo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('clients');
  const [fileName, setFileName] = useState<string | null>(null);
  const [swagger, setSwagger] = useState<unknown>(null);
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<FilterSeverity>('all');
  const [reportMode, setReportMode] = useState<string | null>(null);

  async function readFile(file: File): Promise<void> {
    setError(null);
    setReport(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      setSwagger(json);
      setFileName(file.name);
    } catch {
      setSwagger(null);
      setFileName(null);
      setError('Could not parse file as JSON. Upload a valid OpenAPI/Swagger JSON document.');
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) void readFile(file);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  async function runSwaggerCompare(): Promise<void> {
    if (!activeRepo || !swagger) return;
    setLoading(true);
    setError(null);
    try {
      const result = await compareSwagger({
        repoFullName: activeRepo.fullName,
        swagger,
      });
      setReport(result);
      setReportMode('swagger-upload');
      setFilter('all');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Guardian compare failed.');
    } finally {
      setLoading(false);
    }
  }

  async function runClientScan(): Promise<void> {
    if (!activeRepo) return;
    setLoading(true);
    setError(null);
    try {
      const result = await scanClients(activeRepo.fullName);
      setReport(result);
      setReportMode('client-vs-code');
      setFilter('all');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Client scan failed.');
    } finally {
      setLoading(false);
    }
  }

  async function runRepoSpec(): Promise<void> {
    if (!activeRepo) return;
    setLoading(true);
    setError(null);
    try {
      const result = await compareRepoSpec(activeRepo.fullName);
      setReport(result);
      setReportMode('repo-spec');
      setFilter('all');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Repo OpenAPI compare failed.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadDraft(): Promise<void> {
    if (!activeRepo) return;
    setLoading(true);
    setError(null);
    try {
      const { openapi, endpointCount } = await draftOpenApi(activeRepo.fullName);
      const blob = new Blob([JSON.stringify(openapi, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeRepo.name}-openapi-draft.json`;
      a.click();
      URL.revokeObjectURL(url);
      setError(null);
      setReportMode(`draft-exported (${endpointCount} routes)`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Draft OpenAPI export failed.');
    } finally {
      setLoading(false);
    }
  }

  const filtered: GuardianFinding[] =
    report?.findings.filter((f) => filter === 'all' || f.severity === filter) ?? [];

  if (!activeRepo) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a repository, then run a frontend↔backend scan (no Swagger needed) or upload
          OpenAPI/Swagger JSON.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">API Guardian</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            API contract checks
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            No Swagger? Scan frontend calls against backend routes in{' '}
            <span className="font-mono text-foreground">{activeRepo.fullName}</span>, or download a
            draft OpenAPI from code and refine it later.
          </p>
        </div>
        {report && (
          <Badge variant="outline">
            Checked {new Date(report.checkedAt).toLocaleString()}
            {reportMode ? ` · ${reportMode}` : ''}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'clients' ? 'default' : 'outline'}
          onClick={() => setMode('clients')}
        >
          No Swagger (FE ↔ BE)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'swagger' ? 'default' : 'outline'}
          onClick={() => setMode('swagger')}
        >
          Upload Swagger
        </Button>
      </div>

      {mode === 'clients' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="size-4 text-primary" />
              Frontend ↔ backend scan
            </CardTitle>
            <CardDescription>
              Finds <code className="font-mono text-xs">fetch</code> /{' '}
              <code className="font-mono text-xs">axios</code> /{' '}
              <code className="font-mono text-xs">api.get</code> calls and compares them to Express
              routes — no OpenAPI file required.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void runClientScan()} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              {loading ? 'Scanning…' : 'Scan without Swagger'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void runRepoSpec()} disabled={loading}>
              Use OpenAPI already in repo
            </Button>
            <Button type="button" variant="ghost" onClick={() => void downloadDraft()} disabled={loading}>
              <Download className="size-4" />
              Download draft OpenAPI
            </Button>
            {error && <p className="w-full text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson2 className="size-4 text-primary" />
              Upload OpenAPI / Swagger
            </CardTitle>
            <CardDescription>JSON only · OpenAPI 3 or Swagger 2</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background/40',
              )}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {fileName ? fileName : 'Drop swagger.json here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                We read paths, methods, request bodies, responses, and required fields.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runSwaggerCompare()} disabled={!swagger || loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? 'Comparing…' : 'Generate report'}
              </Button>
              {fileName && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFileName(null);
                    setSwagger(null);
                    setReport(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                >
                  Clear file
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          <GuardianSummaryStrip summary={report.summary} />
          {reportMode === 'client-vs-code' && (
            <p className="text-xs text-muted-foreground">
              In this mode, “spec endpoints” means frontend API calls found in client sources.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter</span>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={filter === s ? 'default' : 'outline'}
                className="h-8 capitalize"
                onClick={() => setFilter(s)}
              >
                {s}
                {s !== 'all' && (
                  <span className="ml-1 tabular-nums opacity-70">{report.summary[s]}</span>
                )}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyFindings />
          ) : (
            <div className="grid gap-3">
              {filtered.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
