'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi, type NodeInfo } from '@/lib/api/system';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, Wifi, Zap, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function LoadBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function NodeCard({ node, onKill }: { node: NodeInfo; onKill: (id: string) => void }) {
  const uptimeMin = Math.floor(node.uptime_seconds / 60);
  const uptimeSec = Math.floor(node.uptime_seconds % 60);
  const uptimeStr = uptimeMin > 0 ? `${uptimeMin}m ${uptimeSec}s` : `${uptimeSec}s`;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-semibold text-sm">{node.node_id}</span>
          </div>
          <Badge
            variant={node.status === 'healthy' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {node.status === 'healthy' ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                healthy
              </span>
            ) : node.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Connections</p>
            <p className="font-semibold flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              {node.active_connections}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="font-semibold">{uptimeStr}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Load</span>
            <span>{node.load_pct}%</span>
          </div>
          <LoadBar pct={node.load_pct} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
          onClick={() => onKill(node.node_id)}
        >
          <Trash2 className="h-3 w-3" />
          Simulate failure
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SystemHealthPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['system-nodes'],
    queryFn: () => systemApi.getNodes(),
    refetchInterval: 10_000, // auto-refresh every 10s
  });

  const killMutation = useMutation({
    mutationFn: (nodeId: string) => systemApi.killNode(nodeId),
    onSuccess: (_, nodeId) => {
      toast.success(`Node ${nodeId} removed — simulating failure`);
      queryClient.invalidateQueries({ queryKey: ['system-nodes'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6" />
            System Health
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live backend node status. Refreshes every 10 seconds.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['system-nodes'] })}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Nodes',
            value: isLoading ? '—' : data?.nodes.length ?? 0,
            icon: Server,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950',
          },
          {
            label: 'Healthy Nodes',
            value: isLoading ? '—' : data?.healthy_nodes ?? 0,
            icon: Zap,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-950',
          },
          {
            label: 'Total Connections',
            value: isLoading ? '—' : data?.total_connections ?? 0,
            icon: Wifi,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-950',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Node grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Active Nodes
          </CardTitle>
          <CardDescription>
            Each node sends a heartbeat to Redis every request. Nodes missing for 30s are removed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : !data?.nodes.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No nodes found</p>
              <p className="text-sm mt-1">
                Nodes appear here when the API server is running and Redis is connected.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.nodes.map((node) => (
                <NodeCard
                  key={node.node_id}
                  node={node}
                  onKill={(id) => killMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Architecture note */}
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">How load balancing works</p>
          Each backend instance writes a heartbeat to Redis (<code className="text-xs bg-muted px-1 py-0.5 rounded">node:heartbeat:&#123;id&#125;</code>) with a 30-second TTL on every <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /system/nodes</code> request.
          Nginx (or any L7 proxy) round-robins requests across instances. WebSocket messages are fanned out across all nodes via Redis pub-sub, so clients can connect to any node and still receive updates from other nodes.
          Use <strong>Simulate failure</strong> to delete a node's heartbeat and watch it disappear from this grid — demonstrating that the remaining nodes continue serving traffic.
        </CardContent>
      </Card>
    </div>
  );
}
