'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Play, BookOpen, Loader2, Code2, BarChart2, Sparkles,
} from 'lucide-react';

import { interviewsApi, type Interview } from '@/lib/api/interviews';
import { problemsApi } from '@/lib/api/problems';
import { aiApi, type AIEvaluation } from '@/lib/api/ai';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AIEvaluationResult } from '@/components/analytics/AIEvaluationResult';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created', WAITING: 'Waiting', IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted', EVALUATING: 'Evaluating', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

const DIFF_COLOR: Record<string, string> = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
};

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const interviewId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: interview, isLoading } = useQuery<Interview>({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId),
    enabled: !!interviewId,
  });

  const { data: problem, isLoading: problemLoading } = useQuery({
    queryKey: ['problem', interview?.problem_id],
    queryFn: () => problemsApi.get(interview!.problem_id!),
    enabled: !!interview?.problem_id,
  });

  const { data: evaluation, isLoading: evalLoading } = useQuery<AIEvaluation>({
    queryKey: ['evaluation', interviewId],
    queryFn: () => aiApi.getEvaluation(interviewId),
    enabled: !!interviewId && ['COMPLETED', 'SUBMITTED', 'EVALUATING'].includes(interview?.status ?? ''),
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: () => interviewsApi.start(interviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', interviewId] });
      toast.success('Interview started! Entering room...');
      router.push(`/interview/${interviewId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const evaluateMutation = useMutation({
    mutationFn: () => aiApi.evaluate(interviewId),
    onSuccess: (data) => {
      queryClient.setQueryData(['evaluation', interviewId], data);
      queryClient.invalidateQueries({ queryKey: ['interview', interviewId] });
      toast.success('Evaluation generated!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Interview not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/interviews">Back to Interviews</Link>
        </Button>
      </div>
    );
  }

  const canStart = interview.status === 'CREATED' || interview.status === 'WAITING';
  const isInProgress = interview.status === 'IN_PROGRESS';
  const isFinished = ['COMPLETED', 'SUBMITTED', 'EVALUATING'].includes(interview.status);
  const canEvaluate = ['SUBMITTED', 'EVALUATING', 'COMPLETED', 'IN_PROGRESS'].includes(interview.status);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/interviews">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      {/* Interview header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{interview.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{STATUS_LABELS[interview.status] ?? interview.status}</Badge>
            <Badge variant="outline">{interview.language}</Badge>
            <span className="text-xs text-muted-foreground">
              Created {format(new Date(interview.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canStart && (
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Start Interview</>
              )}
            </Button>
          )}
          {isInProgress && (
            <Button asChild>
              <Link href={`/interview/${interview.id}`}>
                <Code2 className="mr-2 h-4 w-4" />
                Enter Room
              </Link>
            </Button>
          )}
          {canEvaluate && !evaluation && (
            <Button
              variant="outline"
              onClick={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending}
            >
              {evaluateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Generate AI Evaluation</>
              )}
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/analytics`}>
              <BarChart2 className="mr-1 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Problem info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Assigned Problem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!interview.problem_id ? (
            <p className="text-sm text-muted-foreground">No problem assigned.</p>
          ) : problemLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : problem ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{problem.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[problem.difficulty] ?? 'bg-gray-100'}`}>
                    {problem.difficulty}
                  </span>
                  <Badge variant="outline" className="text-xs">{problem.language}</Badge>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/problems/${problem.id}`}>View Problem</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Problem #{interview.problem_id}</p>
          )}
        </CardContent>
      </Card>

      {/* Timing info */}
      {(interview.started_at || interview.completed_at) && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
            {interview.started_at && (
              <div>
                <p className="text-muted-foreground text-xs">Started</p>
                <p className="font-medium">{format(new Date(interview.started_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
            )}
            {interview.completed_at && (
              <div>
                <p className="text-muted-foreground text-xs">Completed</p>
                <p className="font-medium">{format(new Date(interview.completed_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final code */}
      {isFinished && interview.current_code && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Final Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-64">
              {interview.current_code}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* AI Evaluation */}
      {isFinished && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Evaluation
          </h2>
          {evalLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : evaluation ? (
            <AIEvaluationResult evaluation={evaluation} />
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No evaluation yet. Generate one to see your performance analysis.
                </p>
                {canEvaluate && (
                  <Button
                    onClick={() => evaluateMutation.mutate()}
                    disabled={evaluateMutation.isPending}
                    size="sm"
                  >
                    {evaluateMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />Generate Evaluation</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
