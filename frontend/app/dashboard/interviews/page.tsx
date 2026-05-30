'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus, Play, CheckCircle2, Clock, XCircle, Loader2,
  Trash2, ArrowRight, BookOpen, MessageSquare, Radio, Code2,
} from 'lucide-react';

import { interviewsApi, type Interview } from '@/lib/api/interviews';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CREATED:    { label: 'Created',     icon: <Clock className="h-3 w-3 mr-1" />,       variant: 'outline' },
  WAITING:    { label: 'Waiting',     icon: <Clock className="h-3 w-3 mr-1" />,       variant: 'outline' },
  IN_PROGRESS:{ label: 'In Progress', icon: <Play className="h-3 w-3 mr-1" />,        variant: 'secondary' },
  SUBMITTED:  { label: 'Submitted',   icon: <ArrowRight className="h-3 w-3 mr-1" />,  variant: 'default' },
  EVALUATING: { label: 'Evaluating',  icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />, variant: 'secondary' },
  COMPLETED:  { label: 'Completed',   icon: <CheckCircle2 className="h-3 w-3 mr-1" />,variant: 'default' },
  CANCELLED:  { label: 'Cancelled',   icon: <XCircle className="h-3 w-3 mr-1" />,     variant: 'destructive' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, variant: 'outline' as const };
  return (
    <Badge variant={cfg.variant} className={status === 'COMPLETED' ? 'bg-green-500' : undefined}>
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

export default function InterviewsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCandidate = user?.role === 'CANDIDATE';

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: ['interviews'],
    queryFn: interviewsApi.list,
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => interviewsApi.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      router.push(`/interview/${id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => interviewsApi.delete(id),
    onSuccess: () => {
      toast.success('Interview deleted');
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleStart = (interview: Interview) => {
    startMutation.mutate(interview.id);
  };

  const handleDelete = (interview: Interview) => {
    if (!confirm(`Delete "${interview.title}"?`)) return;
    deleteMutation.mutate(interview.id);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            {isCandidate ? 'My Sessions' : 'Interviews'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCandidate
              ? 'Start a session to open the coding room directly.'
              : 'View all interview sessions.'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/interviews/new">
            <Plus className="mr-2 h-4 w-4" />
            {isCandidate ? 'New Practice Session' : 'New Interview'}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !interviews || interviews.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No interviews yet</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard/interviews/new">
                {isCandidate ? 'Start your first practice session' : 'Create your first interview'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <Card key={interview.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{interview.title}</span>
                    <StatusBadge status={interview.status} />
                    {interview.problem_id && (
                      <Badge variant="outline" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Problem #{interview.problem_id}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{interview.language}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {format(new Date(interview.created_at), 'MMM d, yyyy')}
                    {interview.started_at && ` · Started ${format(new Date(interview.started_at), 'MMM d, yyyy')}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* CREATED / WAITING → Start button directly opens the room */}
                  {(interview.status === 'CREATED' || interview.status === 'WAITING') && (
                    <Button
                      size="sm"
                      onClick={() => handleStart(interview)}
                      disabled={startMutation.isPending && startMutation.variables === interview.id}
                    >
                      {startMutation.isPending && startMutation.variables === interview.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {isCandidate ? 'Enter Room' : 'Start'}
                    </Button>
                  )}

                  {/* IN_PROGRESS → rejoin the live room */}
                  {interview.status === 'IN_PROGRESS' && (
                    <>
                      <Button asChild size="sm">
                        <Link href={`/interview/${interview.id}`}>
                          <Code2 className="h-4 w-4 mr-1" />
                          Enter Room
                        </Link>
                      </Button>
                      {(user?.role === 'INTERVIEWER' || user?.role === 'ADMIN') && interview.interviewer_id && (
                        <Button asChild size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                          <Link href={`/interview/${interview.id}?mode=watch`}>
                            <Radio className="h-3.5 w-3.5 animate-pulse" />
                            Watch Live
                          </Link>
                        </Button>
                      )}
                    </>
                  )}

                  {/* COMPLETED / SUBMITTED → view result */}
                  {(interview.status === 'COMPLETED' || interview.status === 'SUBMITTED') && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/interviews/${interview.id}`}>
                        View Result
                      </Link>
                    </Button>
                  )}

                  {/* Other statuses (EVALUATING, CANCELLED) → details */}
                  {interview.status !== 'CREATED' &&
                   interview.status !== 'WAITING' &&
                   interview.status !== 'IN_PROGRESS' &&
                   interview.status !== 'COMPLETED' &&
                   interview.status !== 'SUBMITTED' && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/interviews/${interview.id}`}>Details</Link>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(interview)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
