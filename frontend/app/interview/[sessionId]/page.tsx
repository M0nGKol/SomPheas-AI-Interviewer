'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { interviewsApi } from '@/lib/api/interviews';
import { problemsApi } from '@/lib/api/problems';
import { codeApi } from '@/lib/api/code';
import { Button } from '@/components/ui/button';
import { InterviewRoom } from '@/components/interview/InterviewRoom';

export default function InterviewRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const interviewId = Number(sessionId);

  const { data: interview, isLoading: interviewLoading, error: interviewError } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId),
    enabled: !!interviewId,
  });

  const { data: problem, isLoading: problemLoading } = useQuery({
    queryKey: ['problem', interview?.problem_id],
    queryFn: () => problemsApi.get(interview!.problem_id!),
    enabled: !!interview?.problem_id,
  });

  const { data: savedCode } = useQuery({
    queryKey: ['code-latest', interviewId],
    queryFn: () => codeApi.getLatestCode(interviewId),
    enabled: !!interviewId,
  });

  if (interviewLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (interviewError || !interview) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Interview not found or access denied.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/interviews">Back to Interviews</Link>
        </Button>
      </div>
    );
  }

  const initialCode =
    savedCode?.code ??
    interview.current_code ??
    problem?.starter_code ??
    getDefaultStarter(interview.language);

  return (
    <InterviewRoom
      interview={interview}
      problem={problem}
      problemLoading={problemLoading}
      initialCode={initialCode}
    />
  );
}

function getDefaultStarter(language: string): string {
  switch (language) {
    case 'python':
      return '# Write your solution here\n\ndef solution():\n    pass\n';
    case 'javascript':
      return '// Write your solution here\n\nfunction solution() {\n\n}\n';
    case 'typescript':
      return '// Write your solution here\n\nfunction solution(): void {\n\n}\n';
    case 'java':
      return '// Write your solution here\n\npublic class Solution {\n    public void solve() {\n\n    }\n}\n';
    case 'cpp':
      return '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n\n    return 0;\n}\n';
    default:
      return '';
  }
}
