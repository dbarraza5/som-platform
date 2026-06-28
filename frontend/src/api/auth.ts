import api from './axios'
import type { AuthUser } from '@/store/authStore'

export interface LoginResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
    user: AuthUser
  }
}

export interface MeResponse {
  success: boolean
  data: { user: AuthUser }
}

export const authApi = {
  register: (body: { nombre: string; email: string; password: string }) =>
    api.post('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    api.post<LoginResponse>('/auth/login', body),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<MeResponse>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
}