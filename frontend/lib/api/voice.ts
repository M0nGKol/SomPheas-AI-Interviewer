import { apiClient } from './client';

export const voiceApi = {
  getToken: (params: Record<string, unknown>): Promise<{ token: string; url: string }> =>
    apiClient.post('/api/v1/voice/token', params),
};
