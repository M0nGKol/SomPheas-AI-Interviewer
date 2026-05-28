'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Problem } from '@/lib/api/problems';

interface ProblemPanelProps {
  problem: Problem | null | undefined;
  loading?: boolean;
}

const DIFF_COLORS: Record<string, string> = {
  EASY:   'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HARD:   'bg-red-100 text-red-800 border-red-200',
};

export function ProblemPanel({ problem, loading }: ProblemPanelProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        <p>No problem assigned to this interview.</p>
        <p className="mt-1 text-xs">You can code freely in the editor.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div>
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="text-base font-semibold leading-tight">{problem.title}</h2>
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${DIFF_COLORS[problem.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
            {problem.difficulty}
          </span>
          <Badge variant="outline" className="text-xs">{problem.language}</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</p>
      </div>

      {problem.test_cases && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Test Cases</h3>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(problem.test_cases, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
