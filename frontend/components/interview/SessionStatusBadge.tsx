'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Play, ArrowRight, Loader2, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  CREATED:     { label: 'Created',     icon: <Clock className="h-3 w-3" />,    className: 'bg-gray-100 text-gray-700 border-gray-200' },
  WAITING:     { label: 'Waiting',     icon: <Clock className="h-3 w-3" />,    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', icon: <Play className="h-3 w-3" />,     className: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUBMITTED:   { label: 'Submitted',   icon: <ArrowRight className="h-3 w-3" />, className: 'bg-purple-100 text-purple-700 border-purple-200' },
  EVALUATING:  { label: 'Evaluating',  icon: <Loader2 className="h-3 w-3 animate-spin" />, className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  COMPLETED:   { label: 'Completed',   icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED:   { label: 'Cancelled',   icon: <XCircle className="h-3 w-3" />,  className: 'bg-red-100 text-red-700 border-red-200' },
};

export function SessionStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
