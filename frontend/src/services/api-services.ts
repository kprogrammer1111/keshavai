import { api } from '@/lib/api';

export const authService = {
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

export const chatService = {
  list: (page = 1) => api.get('/chats', { params: { page } }),
  get: (id: string) => api.get(`/chats/${id}`),
  create: (data?: { title?: string; provider?: string; model?: string }) =>
    api.post('/chats', data),
  update: (id: string, data: { title?: string; isPinned?: boolean }) =>
    api.patch(`/chats/${id}`, data),
  delete: (id: string) => api.delete(`/chats/${id}`),
  search: (query: string) => api.get('/chats/search', { params: { q: query } }),
  export: (id: string) => api.get(`/chats/${id}/export`),
};

export const aiService = {
  listProviders: () => api.get('/ai/providers'),
};

export const userService = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: Record<string, string>) => api.patch('/users/me', data),
  getUsage: () => api.get('/users/me/usage'),
};
