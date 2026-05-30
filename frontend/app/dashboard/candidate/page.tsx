'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlayCircle, BarChart3, MessageSquare, Clock, Trophy,
  ArrowRight, Code2, LogIn, Loader2, Hash,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { interviewsApi } from '@/lib/api/interviews';
import { format } from 'date-fns';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CREATED:    { label: 'Created',     variant: 'outline' },
  WAITING:    { label: 'Waiting',     variant: 'outline' },
  IN_PROGRESS:{ label: 'In Progress', variant: 'secondary' },
  SUBMITTED:  { label: 'Submitted',   variant: 'secondary' },
  EVALUATING: { label: 'Evaluating',  variant: 'secondary' },
  COMPLETED:  { label: 'Completed',   variant: 'default' },
  CANCELLED:  { label: 'Cancelled',   variant: 'destructive' },
};

function JoinWithCodeCard() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s/g, '');
    if (!clean) return;
    setJoining(true);
    setError('');
    try {
      const info = await interviewsApi.joinByCode(clean);
      toast.success(`Joining "${info.title}"…`);
      router.push(`/interview/${info.interview_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid room code';
      setError(msg.includes('404') || msg.toLowerCase().includes('not found')
        ? 'Room code not found. Check with your interviewer.'
        : msg.includes('already') ? msg
        : 'Could not join. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  // Auto-format input as XXX-XXX
  const handleChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) setCode(clean);
    else setCode(`${clean.slice(0, 3)}-${clean.slice(3, 6)}`);
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Join with Room Code</p>
            <p className="text-xs text-muted-foreground">Enter the code your interviewer shared with you</p>
          </div>
        </div>
        <form onSubmit={handleJoin} className="flex gap-2">
          <Input
            placeholder="ABC-123"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={7}
            className="font-mono text-lg tracking-widest uppercase w-36 text-center"
            disabled={joining}
          />
          <Button type="submit" disabled={joining || code.replace('-', '').length < 6} className="gap-1.5">
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {joining ? 'Joining…' : 'Join'}
          </Button>
        </form>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.list(),
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => interviewsApi.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      router.push(`/interview/${id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completed  = interviews?.filter((i) => i.status === 'COMPLETED') ?? [];
  const inProgress = interviews?.filter((i) => i.status === 'IN_PROGRESS') ?? [];
  const waiting    = interviews?.filter((i) => i.status === 'WAITING' || i.status === 'CREATED') ?? [];

  const avgScore =
    completed.length > 0
      ? Math.round(
          (completed.reduce((s, i) => s + (i.feedback?.overall_score ?? 0), 0) / completed.length) * 100
        )
      : null;

  const recent = [...(interviews ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Candidate'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Have a room code from your interviewer? Enter it below to join.
        </p>
      </div>

      {/* Join with code — always visible at top */}
      <JoinWithCodeCard />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Sessions', value: interviews?.length ?? 0,                        icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950'   },
          { label: 'Completed',      value: completed.length,                                icon: Trophy,        color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950' },
          { label: 'In Progress',    value: inProgress.length,                               icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
          { label: 'Avg Score',      value: avgScore !== null ? `${avgScore}%` : '—',        icon: BarChart3,     color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assigned sessions ready to start */}
      {!isLoading && waiting.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-orange-500" />
            Ready to Start
          </h2>
          <div className="space-y-2">
            {waiting.map((interview) => (
              <Card key={interview.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{interview.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(interview.created_at), 'MMM d, yyyy')} · {interview.language}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate(interview.id)}
                    disabled={startMutation.isPending && startMutation.variables === interview.id}
                  >
                    {startMutation.isPending && startMutation.variables === interview.id
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <PlayCircle className="h-4 w-4 mr-1" />}
                    Enter Room
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In-progress sessions */}
      {!isLoading && inProgress.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-blue-500" />
            Continue Coding
          </h2>
          <div className="space-y-2">
            {inProgress.map((interview) => (
              <Card key={interview.id} className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{interview.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {interview.started_at ? format(new Date(interview.started_at), 'MMM d, yyyy') : '—'} · {interview.language}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/interview/${interview.id}`}>
                      <Code2 className="h-4 w-4 mr-1" />
                      Enter Room
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Practice CTA — only when no pending work */}
      {!isLoading && waiting.length === 0 && inProgress.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Start a Practice Interview</h3>
                <p className="text-sm text-muted-foreground">Pick a problem and practice with AI feedback</p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link href="/dashboard/interviews/new">
                Start Practice <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Interview History
          </CardTitle>
          <CardDescription>Your recent sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : recent.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No sessions yet</p>
              <p className="text-sm mt-1">Join using a room code or start a practice session.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((interview) => {
                const badge = STATUS_BADGE[interview.status] ?? { label: interview.status, variant: 'outline' as const };
                return (
                  <Link
                    key={interview.id}
                    href={`/dashboard/interviews/${interview.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{interview.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(interview.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {interview.feedback?.overall_score != null && (
                        <span className="text-sm font-semibold text-green-600">
                          {Math.round(interview.feedback.overall_score * 100)}%
                        </span>
                      )}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
