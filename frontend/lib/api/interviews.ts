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
  room_code: string | null;
  feedback?: {
    overall_score?: number | null;
    technical_score?: number | null;
    code_quality_score?: number | null;
    communication_score?: number | null;
    problem_solving_score?: number | null;
    feedback_summary?: string | null;
    [key: string]: unknown;
  } | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewCreate {
  title: string;
  problem_id?: number | null;
  language?: string;
  assigned_to_user_id?: number | null;
}

export interface Candidate {
  id: number;
  email: string;
  full_name: string;
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

export interface InviteResponse {
  invite_token: string;
  join_url: string;
}

export interface JoinInfo {
  interview_id: number;
  title: string;
  status: string;
  language: string;
  room_code: string;
}

export interface LiveKitTokenResponse {
  livekit_token: string;
  livekit_url: string;
  interview_id: number;
  room_name: string;
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

  listCandidates: (): Promise<Candidate[]> =>
    apiClient.get<Candidate[]>('/api/v1/interviews/candidates'),

  createInvite: (id: number): Promise<InviteResponse> =>
    apiClient.post<InviteResponse>(`/api/v1/interviews/${id}/invite`, {}),

  getJoinInfo: (token: string): Promise<JoinInfo> =>
    apiClient.get<JoinInfo>(`/api/v1/interviews/join/${token}`),

  getGuestLiveKitToken: (token: string, name: string): Promise<LiveKitTokenResponse> =>
    apiClient.post<LiveKitTokenResponse>(`/api/v1/interviews/join/${token}/livekit-token`, { name }),

  getLiveKitToken: (id: number): Promise<LiveKitTokenResponse> =>
    apiClient.post<LiveKitTokenResponse>(`/api/v1/interviews/${id}/livekit-token`, {}),

  joinByCode: (roomCode: string): Promise<JoinInfo> =>
    apiClient.get<JoinInfo>(`/api/v1/interviews/code/${roomCode.toUpperCase().replace(/\s/g, '')}`),
};
