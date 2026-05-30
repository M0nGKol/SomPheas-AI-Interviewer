'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SessionTimer } from './SessionTimer';
import { SessionStatusBadge } from './SessionStatusBadge';
import { interviewsApi } from '@/lib/api/interviews';
import type { Interview } from '@/lib/api/interviews';

interface InterviewHeaderProps {
  interview: Interview;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function InterviewHeader({ interview, onSubmit, isSubmitting }: InterviewHeaderProps) {
  const isActive = interview.status === 'IN_PROGRESS';
  const isFinished = interview.status === 'COMPLETED' || interview.status === 'SUBMITTED';
  const [copied, setCopied] = useState(false);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    setInviting(true);
    try {
      const { join_url } = await interviewsApi.createInvite(interview.id);
      await navigator.clipboard.writeText(join_url);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to generate invite link');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-3 min-w-0">
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/dashboard/interviews">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{interview.title}</h1>
        </div>
        <SessionStatusBadge status={interview.status} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isActive && (
          <SessionTimer startedAt={interview.started_at} running={isActive} />
        )}

        {/* Invite button — available on active or waiting sessions */}
        {(isActive || interview.status === 'CREATED' || interview.status === 'WAITING') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleInvite}
            disabled={inviting}
            className="gap-1.5"
          >
            {inviting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied!' : 'Invite'}
          </Button>
        )}

        {isActive && (
          <Button size="sm" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" />Submit</>
            )}
          </Button>
        )}
        {isFinished && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/interviews/${interview.id}`}>View Result</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
