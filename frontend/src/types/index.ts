export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Chat {
  id: string;
  title: string;
  isPinned: boolean;
  model?: string;
  provider?: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  tokenCount?: number;
  createdAt: string;
}

export interface AIProvider {
  name: string;
  models: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
