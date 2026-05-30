'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Problem } from '@/lib/api/problems';
import { renderMarkdown } from '@/lib/markdown';

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
      {/* Title + badges */}
      <div className="flex items-start gap-2 flex-wrap">
        <h2 className="text-base font-semibold leading-tight">{problem.title}</h2>
        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${DIFF_COLORS[problem.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
          {problem.difficulty}
        </span>
        <Badge variant="outline" className="text-xs">{problem.language}</Badge>
      </div>

      {/* Description — rendered markdown */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
        <div>{renderMarkdown(problem.description ?? '')}</div>
      </div>

      {/* Test cases — clean key/value view */}
      {problem.test_cases && Array.isArray(problem.test_cases) && problem.test_cases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examples</h3>
          {(problem.test_cases as Array<{ input: Record<string, unknown>; expected: unknown }>).map((tc, idx) => (
            <div key={idx} className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-1">
              <div>
                <span className="text-muted-foreground">Input:&nbsp;</span>
                {Object.entries(tc.input).map(([k, v]) => (
                  <span key={k} className="mr-2">
                    <span className="text-blue-500">{k}</span>
                    {' = '}
                    <span>{JSON.stringify(v)}</span>
                  </span>
                ))}
              </div>
              <div>
                <span className="text-muted-foreground">Output:&nbsp;</span>
                <span className="text-green-600">{JSON.stringify(tc.expected)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
