import { apiClient } from './client';

export interface NodeInfo {
  node_id: string;
  status: string;
  uptime_seconds: number;
  active_connections: number;
  load_pct: number;
}

export interface SystemHealthResponse {
  nodes: NodeInfo[];
  total_connections: number;
  healthy_nodes: number;
}

export const systemApi = {
  getNodes: (): Promise<SystemHealthResponse> =>
    apiClient.get<SystemHealthResponse>('/api/v1/system/nodes'),

  killNode: (nodeId: string): Promise<{ killed: string }> =>
    apiClient.post<{ killed: string }>(`/api/v1/system/nodes/${nodeId}/kill`, {}),
};
