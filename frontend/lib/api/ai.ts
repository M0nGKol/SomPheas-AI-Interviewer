import { apiClient } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null; }

export type StreamChunkHandler = (chunk: string) => void;
export type StreamDoneHandler = (aiMessage: AIMessage) => void;

export async function streamMessage(
  interviewId: number,
  content: string,
  opts: { current_code?: string; language?: string; execution_result?: object } = {},
  onChunk: StreamChunkHandler,
  onDone: StreamDoneHandler,
  onError: (err: string) => void,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/v1/ai/interviews/${interviewId}/stream-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content, ...opts }),
  });

  if (!res.ok || !res.body) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.type === 'chunk') onChunk(payload.text);
          else if (payload.type === 'done') {
            completed = true;
            onDone(payload.ai_message as AIMessage);
          } else if (payload.type === 'error') {
            onError(payload.message ?? 'AI error');
            return;
          }
        } catch { /* ignore malformed SSE lines */ }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Stream interrupted');
    return;
  }

  if (!completed) {
    onError('Stream ended without a response. Please retry.');
  }
}

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
