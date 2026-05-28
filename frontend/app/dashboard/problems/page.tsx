'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { problemsApi, type Problem } from '@/lib/api/problems';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, PlusCircle, Pencil, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DIFFICULTY_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  EASY: { label: 'Easy', variant: 'default' },
  MEDIUM: { label: 'Medium', variant: 'secondary' },
  HARD: { label: 'Hard', variant: 'destructive' },
};

export default function ProblemsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'INTERVIEWER' || user?.role === 'ADMIN';

  const { data: problems, isLoading, error } = useQuery({
    queryKey: ['problems'],
    queryFn: problemsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => problemsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success('Problem deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (problem: Problem) => {
    if (!confirm(`Delete "${problem.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(problem.id);
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Problems
          </h1>
          <p className="text-muted-foreground mt-1">
            {canEdit ? 'Manage the coding problem library.' : 'Browse problems and start a practice session.'}
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/dashboard/problems/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Problem
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !problems || problems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No problems yet</p>
            {canEdit && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/problems/new">Create the first problem</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {problems.map((problem) => {
            const diff = DIFFICULTY_BADGE[problem.difficulty] ?? { label: problem.difficulty, variant: 'outline' as const };
            return (
              <Card key={problem.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{problem.title}</span>
                      <Badge variant={diff.variant}>{diff.label}</Badge>
                      <Badge variant="outline" className="text-xs">{problem.language}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(problem.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/problems/${problem.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">View</span>
                      </Link>
                    </Button>
                    {canEdit && (
                      <>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/problems/${problem.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Edit</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(problem)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
