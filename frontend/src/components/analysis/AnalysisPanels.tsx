import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderTreeView } from '@/components/analysis/FolderTreeView';
import type { RepositoryAnalysis } from '@devguardian/shared';

interface AnalysisPanelsProps {
  analysis: RepositoryAnalysis;
}

export function ProjectSummaryCard({ analysis }: AnalysisPanelsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Summary</CardTitle>
        <CardDescription>Generated from README, package.json, and source layout</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {analysis.summary.split(/\n\n+/).map((para, i) => (
            <p key={i} className="whitespace-pre-wrap text-foreground/90">
              {para.replace(/\*\*/g, '')}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TechStackCard({ analysis }: AnalysisPanelsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tech Stack</CardTitle>
        <CardDescription>Signals from package.json dependencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {analysis.techStack.length ? (
            analysis.techStack.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No stack signals detected.</p>
          )}
        </div>
        {analysis.frameworks.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Frameworks
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.frameworks.map((f) => (
                <Badge key={f} variant="default">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Database
          </p>
          <p className="text-sm">{analysis.database ?? 'Not detected'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FolderStructureCard({ analysis }: AnalysisPanelsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Folder Structure</CardTitle>
        <CardDescription>Depth-limited tree (noise dirs skipped)</CardDescription>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <FolderTreeView node={analysis.folderTree} />
      </CardContent>
    </Card>
  );
}

export function AuthFlowCard({ analysis }: AnalysisPanelsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Authentication Flow</CardTitle>
        <CardDescription>Inferred from middleware and auth-related source</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{analysis.authFlow}</p>
      </CardContent>
    </Card>
  );
}

export function ArchitectureCard({ analysis }: AnalysisPanelsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Architecture Overview</CardTitle>
        <CardDescription>Simple stack flow from detected layers</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border border-border bg-background/50 p-4 font-mono text-sm leading-loose text-primary">
          {analysis.architectureDiagram}
        </pre>
      </CardContent>
    </Card>
  );
}
