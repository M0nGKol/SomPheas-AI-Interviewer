import { apiClient } from './client';

export interface RecentInterview {
  id: number;
  title: string;
  status: string;
  user_id: number;
  created_at: string;
  completed_at: string | null;
  overall_score: number | null;
}

export interface OverviewData {
  total_interviews: number;
  completed_interviews: number;
  active_interviews: number;
  average_score: number | null;
  average_duration_minutes: number | null;
  total_code_runs: number;
  total_ai_messages: number;
  recent_interviews: RecentInterview[];
  recent_session_events: SessionEvent[];
}

export interface SessionEvent {
  id?: number;
  interview_id: number;
  event_type: string;
  created_at: string;
}

export interface InterviewAnalytics {
  interview_id: number;
  title: string;
  status: string;
  language: string;
  user_id: number;
  user_email: string | null;
  problem_id: number | null;
  problem_title: string | null;
  code_submissions_count: number;
  latest_code_result: object | null;
  ai_evaluation: {
    overall_score: number | null;
    technical_score: number | null;
    code_quality_score: number | null;
    communication_score: number | null;
    problem_solving_score: number | null;
    feedback_summary: string | null;
  } | null;
  session_events: SessionEvent[];
  message_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CandidateAnalytics {
  user_id: number;
  email: string;
  full_name: string | null;
  total_interviews: number;
  completed_interviews: number;
  average_score: number | null;
  best_score: number | null;
  latest_feedback: string | null;
  total_code_runs: number;
  total_messages: number;
}

export interface SystemActivity {
  recent_session_events: SessionEvent[];
  recent_code_submissions: object[];
  recent_completed_interviews: object[];
}

export const analyticsApi = {
  getOverview: () => apiClient.get<OverviewData>('/api/v1/analytics/overview'),
  getInterviewAnalytics: (id: number) => apiClient.get<InterviewAnalytics>(`/api/v1/analytics/interviews/${id}`),
  getCandidateAnalytics: (id: number) => apiClient.get<CandidateAnalytics>(`/api/v1/analytics/candidates/${id}`),
  getSystemActivity: () => apiClient.get<SystemActivity>('/api/v1/analytics/system-activity'),
};
