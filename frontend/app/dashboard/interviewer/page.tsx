'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  PlusCircle, BookOpen, BarChart3, ArrowRight, Brain,
  Radio, Users, ClipboardList, Play,
} from 'lucide-react';

import { useAuthStore } from '@/lib/store/auth-store';
import { interviewsApi, type Interview } from '@/lib/api/interviews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className="text-muted-foreground opacity-50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InterviewerDashboard() {
  const { user } = useAuthStore();

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: ['interviews'],
    queryFn: interviewsApi.list,
  });

  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: interviewsApi.listCandidates,
  });

  const active = interviews?.filter((i) => i.status === 'IN_PROGRESS') ?? [];
  const completed = interviews?.filter((i) => i.status === 'COMPLETED') ?? [];
  const pending = interviews?.filter((i) => i.status === 'CREATED' || i.status === 'WAITING') ?? [];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.full_name?.split(' ')[0] || 'Interviewer'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage problems, review candidates, and track session analytics.
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Sessions" value={interviews?.length ?? 0} icon={<ClipboardList className="h-8 w-8" />} />
          <StatCard label="Live Now" value={active.length} icon={<Radio className="h-8 w-8" />} />
          <StatCard label="Completed" value={completed.length} icon={<Brain className="h-8 w-8" />} />
          <StatCard label="Candidates" value={candidates?.length ?? '—'} icon={<Users className="h-8 w-8" />} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <Link href="/dashboard/problems/new">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Create Problem</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Add a new coding problem with starter code and test cases.</p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <Link href="/dashboard/problems">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Problem Library</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Browse, edit, or delete existing problems in the library.</p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-blue-600">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <Link href="/dashboard/analytics">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View candidate performance and session analytics.</p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-purple-600">
                View charts <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Live Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              Live Sessions
            </CardTitle>
            <CardDescription>Currently active interview sessions</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/interviews/new">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              New Session
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : active.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active sessions right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((interview) => (
                <div key={interview.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium text-sm">{interview.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {interview.started_at ? format(new Date(interview.started_at), 'MMM d, h:mm a') : '—'}
                      {' · '}{interview.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Play className="h-2.5 w-2.5 mr-1" />
                      Live
                    </Badge>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-7">
                      <Link href={`/interview/${interview.id}?mode=watch`}>
                        <Radio className="h-3 w-3" />
                        Watch
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidates
          </CardTitle>
          <CardDescription>All registered candidates on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCandidates ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !candidates || candidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No candidates registered yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <Link href={`/dashboard/interviews/new?candidate=${c.id}`}>
                      Assign Session
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Evaluations
          </CardTitle>
          <CardDescription>Recently completed sessions with AI feedback</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : completed.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No completed sessions yet</p>
              <Button asChild variant="outline" className="mt-3" size="sm">
                <Link href="/dashboard/problems/new">Create your first problem</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 5).map((interview) => (
                <div key={interview.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium text-sm">{interview.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Completed {interview.completed_at ? format(new Date(interview.completed_at), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs h-7">
                    <Link href={`/dashboard/interviews/${interview.id}`}>View Feedback</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
