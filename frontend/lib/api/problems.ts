import { apiClient } from './client';

export interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: string;
  starter_code: string | null;
  test_cases: unknown | null;
  expected_solution: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemCreate {
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: string;
  starter_code?: string;
  test_cases?: unknown;
  expected_solution?: string;
}

export interface ProblemUpdate {
  title?: string;
  description?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  language?: string;
  starter_code?: string;
  test_cases?: unknown;
  expected_solution?: string;
}

export const problemsApi = {
  list: (): Promise<Problem[]> => apiClient.get<Problem[]>('/api/v1/problems'),

  get: (id: number): Promise<Problem> => apiClient.get<Problem>(`/api/v1/problems/${id}`),

  create: (data: ProblemCreate): Promise<Problem> =>
    apiClient.post<Problem>('/api/v1/problems', data),

  update: (id: number, data: ProblemUpdate): Promise<Problem> =>
    apiClient.patch<Problem>(`/api/v1/problems/${id}`, data),

  delete: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/v1/problems/${id}`),
};
