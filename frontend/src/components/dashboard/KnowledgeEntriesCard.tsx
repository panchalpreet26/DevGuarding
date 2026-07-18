import { BookMarked } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { KnowledgeSummary } from '@/types/dashboard';

interface KnowledgeEntriesCardProps {
  knowledge: KnowledgeSummary;
}

export function KnowledgeEntriesCard({ knowledge }: KnowledgeEntriesCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="size-4 text-primary" />
            Knowledge Entries
          </CardTitle>
          <CardDescription>Engineering memory for this repository</CardDescription>
        </div>
        <Badge variant="secondary">{knowledge.total} saved</Badge>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {knowledge.recent.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium leading-snug">{entry.question}</p>
                <p className="text-xs text-muted-foreground">
                  @{entry.author} · {entry.updatedAt}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
