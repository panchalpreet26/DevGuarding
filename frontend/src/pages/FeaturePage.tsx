import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FeaturePageProps {
  title: string;
  description: string;
}

/** Minimal routed page shell for sidebar destinations not yet implemented. */
export default function FeaturePage({ title, description }: FeaturePageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Next milestone</CardTitle>
          <CardDescription>
            This surface is wired in the shell so navigation stays intact while feature work lands.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Layout, dark theme, and shared components are ready. Feature logic will plug into this
          route without redesigning the shell.
        </CardContent>
      </Card>
    </div>
  );
}
