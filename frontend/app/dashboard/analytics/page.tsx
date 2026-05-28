'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, BarChart3 } from 'lucide-react';

import { analyticsApi } from '@/lib/api/analytics';
import { useAuthStore } from '@/lib/store/auth-store';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';

export default function AnalyticsDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-2">
        <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Failed to load analytics.</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.role === 'CANDIDATE' ? 'Your interview performance overview' : 'Platform-wide interview analytics'}
        </p>
      </div>
      <AnalyticsOverview data={data} />
    </div>
  );
}
