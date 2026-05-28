import { apiClient } from './client';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'CANDIDATE' | 'INTERVIEWER' | 'ADMIN';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }): Promise<AuthToken> => apiClient.post<AuthToken>('/api/v1/auth/register', data),

  login: (email: string, password: string): Promise<AuthToken> =>
    apiClient.post<AuthToken>('/api/v1/auth/login', { email, password }),

  me: (): Promise<User> => apiClient.get<User>('/api/v1/auth/me'),
};
