'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { problemsApi } from '@/lib/api/problems';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { renderMarkdown } from '@/lib/markdown';

const DIFF_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  EASY: { label: 'Easy', variant: 'default' },
  MEDIUM: { label: 'Medium', variant: 'secondary' },
  HARD: { label: 'Hard', variant: 'destructive' },
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const canEdit = user?.role === 'INTERVIEWER' || user?.role === 'ADMIN';

  const { data: problem, isLoading, error } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.get(Number(id)),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/problems">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        {canEdit && problem && (
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link href={`/dashboard/problems/${problem.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : problem ? (
        <>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              {DIFF_BADGE[problem.difficulty] && (
                <Badge variant={DIFF_BADGE[problem.difficulty].variant}>
                  {DIFF_BADGE[problem.difficulty].label}
                </Badge>
              )}
              <Badge variant="outline">{problem.language}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created {format(new Date(problem.created_at), 'MMM d, yyyy')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">{renderMarkdown(problem.description ?? '')}</div>
            </CardContent>
          </Card>

          {problem.starter_code && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Starter Code</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted rounded-md p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {problem.starter_code}
                </pre>
              </CardContent>
            </Card>
          )}

          {problem.test_cases && Array.isArray(problem.test_cases) && (problem.test_cases as Array<{input: Record<string,unknown>; expected: unknown}>).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Examples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(problem.test_cases as Array<{input: Record<string,unknown>; expected: unknown}>).map((tc, idx) => (
                  <div key={idx} className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-1">
                    <div>
                      <span className="text-muted-foreground">Input:&nbsp;</span>
                      {Object.entries(tc.input).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          <span className="text-blue-500">{k}</span>{' = '}<span>{JSON.stringify(v)}</span>
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output:&nbsp;</span>
                      <span className="text-green-600">{JSON.stringify(tc.expected)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
