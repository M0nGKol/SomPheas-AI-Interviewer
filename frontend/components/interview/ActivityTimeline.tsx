'use client';

import { format } from 'date-fns';
import { CheckCircle2, Play, Send, Clock } from 'lucide-react';

interface ActivityEvent {
  event_type: string;
  created_at: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  SESSION_CREATED:   <Clock className="h-3.5 w-3.5 text-gray-500" />,
  SESSION_STARTED:   <Play className="h-3.5 w-3.5 text-blue-500" />,
  SESSION_SUBMITTED: <Send className="h-3.5 w-3.5 text-purple-500" />,
  SESSION_COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};

const EVENT_LABELS: Record<string, string> = {
  SESSION_CREATED:   'Session created',
  SESSION_STARTED:   'Session started',
  SESSION_SUBMITTED: 'Code submitted',
  SESSION_COMPLETED: 'Session completed',
};

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground px-2">No activity yet.</p>;
  }

  return (
    <div className="space-y-2 px-2">
      {events.map((ev, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {EVENT_ICONS[ev.event_type] ?? <Clock className="h-3.5 w-3.5 text-gray-400" />}
          <span className="text-muted-foreground">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</span>
          <span className="ml-auto text-muted-foreground/60">
            {format(new Date(ev.created_at), 'HH:mm')}
          </span>
        </div>
      ))}
    </div>
  );
}
