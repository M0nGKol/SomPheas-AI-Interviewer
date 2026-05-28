import { apiClient } from './client';

export interface CodeSaveRequest {
  language: string;
  code: string;
}

export interface CodeSaveResponse {
  id: number;
  interview_id: number;
  language: string;
  code: string;
  saved_at: string;
}

export interface CodeRunRequest {
  language: string;
  code: string;
  stdin?: string;
}

export interface CodeRunResponse {
  stdout: string;
  stderr: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';
  runtime_ms: number;
}

export interface CodeSubmission {
  id: number;
  interview_id: number;
  language: string;
  code: string;
  stdin: string | null;
  stdout: string | null;
  stderr: string | null;
  status: string;
  runtime_ms: number | null;
  passed: boolean;
  created_at: string;
}

export const codeApi = {
  saveCode: (interviewId: number, data: CodeSaveRequest): Promise<CodeSaveResponse> =>
    apiClient.post<CodeSaveResponse>(`/api/v1/code/interviews/${interviewId}/save`, data),

  getLatestCode: (interviewId: number): Promise<CodeSaveResponse | null> =>
    apiClient.get<CodeSaveResponse | null>(`/api/v1/code/interviews/${interviewId}/latest`),

  runCode: (interviewId: number, data: CodeRunRequest): Promise<CodeRunResponse> =>
    apiClient.post<CodeRunResponse>(`/api/v1/code/interviews/${interviewId}/run`, data),

  submitCode: (interviewId: number, data: CodeRunRequest): Promise<CodeSubmission> =>
    apiClient.post<CodeSubmission>(`/api/v1/code/interviews/${interviewId}/submit`, data),

  listSubmissions: (interviewId: number): Promise<CodeSubmission[]> =>
    apiClient.get<CodeSubmission[]>(`/api/v1/code/interviews/${interviewId}/submissions`),
};
