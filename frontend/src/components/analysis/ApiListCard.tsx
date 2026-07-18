import type { ApiEndpoint } from '@devguardian/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const methodVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> =
  {
    GET: 'success',
    POST: 'default',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'destructive',
  };

interface ApiListCardProps {
  endpoints: ApiEndpoint[];
}

export function ApiListCard({ endpoints }: ApiListCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>API List</CardTitle>
        <CardDescription>
          {endpoints.length
            ? `${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'} extracted from routes/controllers`
            : 'No route declarations found in scanned files'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Try a Node/Express or NestJS repo, or ensure route files live under routes/, controllers/,
            or similar paths.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {endpoints.map((ep) => (
              <li
                key={`${ep.method}-${ep.path}-${ep.file}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2"
              >
                <Badge variant={methodVariant[ep.method] ?? 'secondary'}>{ep.method}</Badge>
                <code className="font-mono text-sm">{ep.path}</code>
                {ep.file && (
                  <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                    {ep.file}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
