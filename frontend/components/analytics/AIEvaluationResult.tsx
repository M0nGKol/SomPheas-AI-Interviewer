'use client';

import type { AIEvaluation } from '@/lib/api/ai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScoreBarProps {
  label: string;
  score: number | null;
}

function ScoreBar({ label, score }: ScoreBarProps) {
  const pct = score ?? 0;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score ?? '—'}{score !== null ? '/100' : ''}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface AIEvaluationResultProps {
  evaluation: AIEvaluation;
}

export function AIEvaluationResult({ evaluation }: AIEvaluationResultProps) {
  const overall = evaluation.overall_score;
  const scoreColor = overall != null
    ? overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-yellow-600' : 'text-red-600'
    : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold ${scoreColor}`}>
            {overall ?? '—'}
            {overall !== null && <span className="text-lg text-muted-foreground">/100</span>}
          </div>
          {evaluation.feedback_summary && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {evaluation.feedback_summary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Score breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScoreBar label="Technical" score={evaluation.technical_score} />
          <ScoreBar label="Code Quality" score={evaluation.code_quality_score} />
          <ScoreBar label="Communication" score={evaluation.communication_score} />
          <ScoreBar label="Problem Solving" score={evaluation.problem_solving_score} />
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      {((evaluation.strengths?.length ?? 0) > 0 || (evaluation.weaknesses?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(evaluation.strengths?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {evaluation.strengths!.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {(evaluation.weaknesses?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700">Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {evaluation.weaknesses!.map((w, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">✗</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
