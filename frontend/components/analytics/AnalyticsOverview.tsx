'use client';

import type { OverviewData } from '@/lib/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  CREATED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface AnalyticsOverviewProps {
  data: OverviewData;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const chartData = [
    { name: 'Total', value: data.total_interviews },
    { name: 'Completed', value: data.completed_interviews },
    { name: 'Active', value: data.active_interviews },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Interviews" value={data.total_interviews} />
        <StatCard title="Completed" value={data.completed_interviews} />
        <StatCard title="Active Now" value={data.active_interviews} />
        <StatCard
          title="Avg Score"
          value={data.average_score != null ? `${data.average_score}/100` : '—'}
          subtitle="AI evaluation average"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Code Runs" value={data.total_code_runs} subtitle="Total executions" />
        <StatCard title="AI Messages" value={data.total_ai_messages} subtitle="AI responses sent" />
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent interviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interviews yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_interviews.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(i.created_at), 'MMM d')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.overall_score != null && (
                      <span className="text-xs font-medium">{i.overall_score}/100</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {i.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      {data.recent_session_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.recent_session_events.slice(0, 8).map((e, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{e.event_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.created_at), 'MMM d HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
