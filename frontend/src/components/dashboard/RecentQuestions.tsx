import { MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecentQuestion } from '@/types/dashboard';

interface RecentQuestionsProps {
  questions: RecentQuestion[];
}

export function RecentQuestions({ questions }: RecentQuestionsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" />
          Recent Questions
        </CardTitle>
        <CardDescription>Latest prompts answered from repository context</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {questions.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
          >
            <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm leading-snug">{item.question}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.answered ? 'success' : 'warning'}>
                  {item.answered ? 'Answered' : 'Needs memory'}
                </Badge>
                {item.answered && (
                  <span className="text-[11px] text-muted-foreground">
                    {item.citations} citation{item.citations === 1 ? '' : 's'}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{item.askedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
