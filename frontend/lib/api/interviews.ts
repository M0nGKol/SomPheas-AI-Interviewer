import { apiClient } from './client';

export interface Interview {
  id: number;
  user_id: number;
  interviewer_id: number | null;
  problem_id: number | null;
  title: string;
  status: 'CREATED' | 'WAITING' | 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'CANCELLED';
  language: string;
  current_code: string | null;
  feedback?: Record<string, unknown> | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewCreate {
  title: string;
  problem_id?: number | null;
  language?: string;
}

export interface InterviewUpdate {
  title?: string;
  problem_id?: number | null;
  language?: string;
  current_code?: string;
}

export interface InterviewStartResponse {
  id: number;
  status: string;
  started_at: string | null;
}

export const interviewsApi = {
  list: (): Promise<Interview[]> =>
    apiClient.get<Interview[]>('/api/v1/interviews'),

  get: (id: number): Promise<Interview> =>
    apiClient.get<Interview>(`/api/v1/interviews/${id}`),

  create: (data: InterviewCreate): Promise<Interview> =>
    apiClient.post<Interview>('/api/v1/interviews', data),

  update: (id: number, data: InterviewUpdate): Promise<Interview> =>
    apiClient.patch<Interview>(`/api/v1/interviews/${id}`, data),

  start: (id: number): Promise<InterviewStartResponse> =>
    apiClient.post<InterviewStartResponse>(`/api/v1/interviews/${id}/start`, {}),

  submit: (id: number, code?: string): Promise<Interview> =>
    apiClient.post<Interview>(`/api/v1/interviews/${id}/submit`, { code }),

  complete: (id: number): Promise<Interview> =>
    apiClient.post<Interview>(`/api/v1/interviews/${id}/complete`, {}),

  delete: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/v1/interviews/${id}`),
};
