import { apiClient } from './client';

export interface AIMessage {
  id: number;
  interview_id: number;
  sender_id: number | null;
  sender_type: 'CANDIDATE' | 'AI' | 'INTERVIEWER' | 'SYSTEM';
  content: string;
  created_at: string;
}

export interface ChatResponse {
  user_message: AIMessage;
  ai_message: AIMessage;
}

export interface CodeReviewResponse {
  review: string;
  message: AIMessage;
}

export interface AIEvaluation {
  id: number;
  interview_id: number;
  technical_score: number | null;
  code_quality_score: number | null;
  communication_score: number | null;
  problem_solving_score: number | null;
  overall_score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  feedback_summary: string | null;
  raw_evaluation: unknown;
  created_at: string;
}

export const aiApi = {
  getMessages: (interviewId: number) =>
    apiClient.get<AIMessage[]>(`/api/v1/ai/interviews/${interviewId}/messages`),

  sendMessage: (
    interviewId: number,
    content: string,
    opts?: { current_code?: string; language?: string; execution_result?: object }
  ) =>
    apiClient.post<ChatResponse>(`/api/v1/ai/interviews/${interviewId}/message`, {
      content,
      ...opts,
    }),

  reviewCode: (
    interviewId: number,
    code: string,
    language: string,
    execution_result?: object
  ) =>
    apiClient.post<CodeReviewResponse>(`/api/v1/ai/interviews/${interviewId}/review-code`, {
      code,
      language,
      execution_result,
    }),

  evaluate: (interviewId: number) =>
    apiClient.post<AIEvaluation>(`/api/v1/ai/interviews/${interviewId}/evaluate`, {}),

  getEvaluation: (interviewId: number) =>
    apiClient.get<AIEvaluation>(`/api/v1/ai/interviews/${interviewId}/evaluation`),
};
