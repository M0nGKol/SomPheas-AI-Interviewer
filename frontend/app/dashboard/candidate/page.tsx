'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlayCircle,
  BookOpen,
  BarChart3,
  MessageSquare,
  Clock,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { interviewsApi } from '@/lib/api/interviews';
import { format } from 'date-fns';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CREATED: { label: 'Created', variant: 'outline' },
  WAITING: { label: 'Waiting', variant: 'outline' },
  IN_PROGRESS: { label: 'In Progress', variant: 'secondary' },
  SUBMITTED: { label: 'Submitted', variant: 'secondary' },
  EVALUATING: { label: 'Evaluating', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

export default function CandidateDashboard() {
  const { user } = useAuthStore();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.list(),
  });

  const completed = interviews?.filter((i) => i.status === 'COMPLETED') ?? [];
  const inProgress = interviews?.filter((i) => i.status === 'IN_PROGRESS') ?? [];
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
          Ready to sharpen your skills? Start a practice session below.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Sessions', value: interviews?.length ?? 0, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
          { label: 'Completed', value: completed.length, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
          { label: 'In Progress', value: inProgress.length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
          { label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : '—', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
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
            <Link href="/dashboard/problems">
              Browse Problems <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Interview History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Interview History
          </CardTitle>
          <CardDescription>Your recent practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No sessions yet</p>
              <p className="text-sm mt-1">Start your first practice interview to see history here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((interview) => {
                const badge = STATUS_BADGE[interview.status] ?? { label: interview.status, variant: 'outline' as const };
                return (
                  <div
                    key={interview.id}
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
