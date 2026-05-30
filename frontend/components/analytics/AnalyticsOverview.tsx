'use client';

import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  MessageSquare, CheckCircle2, Play, BarChart3,
  Code2, Bot, Activity,
} from 'lucide-react';

import type { OverviewData } from '@/lib/api/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CREATED: 'outline',
  WAITING: 'outline',
  IN_PROGRESS: 'secondary',
  SUBMITTED: 'secondary',
  EVALUATING: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

const EVENT_LABEL_COLOR: Record<string, string> = {
  PASTE_DETECTED: 'text-orange-500',
  SUSPICIOUS_ACTIVITY: 'text-red-500',
  SESSION_START: 'text-blue-500',
  SESSION_END: 'text-green-500',
};

function scoreColor(score: number): string {
  if (score >= 0.75) return '#22c55e';
  if (score >= 0.5) return '#eab308';
  return '#ef4444';
}

interface Props {
  data: OverviewData;
}

export function AnalyticsOverview({ data }: Props) {
  const completionRate =
    data.total_interviews > 0
      ? Math.round((data.completed_interviews / data.total_interviews) * 100)
      : 0;

  // Chart: recent interviews with scores, oldest → newest, capped at 8
  const chartData = data.recent_interviews
    .filter((i) => i.overall_score != null)
    .slice(0, 8)
    .reverse()
    .map((i) => ({
      name: i.title.length > 16 ? i.title.slice(0, 14) + '…' : i.title,
      score: Math.round((i.overall_score ?? 0) * 100),
      raw: i.overall_score ?? 0,
    }));

  const stats = [
    {
      label: 'Total Interviews',
      value: data.total_interviews,
      sub: null,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Completed',
      value: data.completed_interviews,
      sub: `${completionRate}% completion rate`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Active Now',
      value: data.active_interviews,
      sub: null,
      icon: Play,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      label: 'Avg Score',
      value: data.average_score != null ? `${Math.round(data.average_score * 100)}%` : '—',
      sub: 'AI evaluation average',
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Code Runs',
      value: data.total_code_runs,
      sub: 'Total executions',
      icon: Code2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      label: 'AI Messages',
      value: data.total_ai_messages,
      sub: 'AI responses sent',
      icon: Bot,
      color: 'text-pink-600',
      bg: 'bg-pink-50 dark:bg-pink-950',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`${bg} p-1.5 rounded-md`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Interview Scores</CardTitle>
            <CardDescription>
              {chartData.length > 0
                ? `Last ${chartData.length} scored interview${chartData.length === 1 ? '' : 's'}`
                : 'No scored interviews yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Complete an interview to see scores here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Score']}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.raw)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_session_events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>
            ) : (
              <div className="space-y-2.5">
                {data.recent_session_events.slice(0, 8).map((evt, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span
                      className={`font-medium ${EVENT_LABEL_COLOR[evt.event_type] ?? 'text-muted-foreground'}`}
                    >
                      {evt.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {format(new Date(evt.created_at), 'MMM d HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Interviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Interviews</CardTitle>
          <CardDescription>Last 10 interviews</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No interviews yet</p>
          ) : (
            <div className="space-y-2">
              {data.recent_interviews.map((interview) => {
                const variant = STATUS_VARIANT[interview.status] ?? 'outline';
                return (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{interview.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(interview.created_at), 'MMM d, yyyy')}
                        {interview.completed_at && (
                          <> · Completed {format(new Date(interview.completed_at), 'MMM d')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {interview.overall_score != null && (
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: scoreColor(interview.overall_score) }}
                        >
                          {Math.round(interview.overall_score * 100)}%
                        </span>
                      )}
                      <Badge
                        variant={variant}
                        className={interview.status === 'COMPLETED' ? 'bg-green-500 text-white border-green-500' : undefined}
                      >
                        {interview.status.replace('_', ' ')}
                      </Badge>
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
