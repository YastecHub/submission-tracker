import api from '../../../api/axios';
import type { User } from '../../../types';

export async function getCurrentUser(signal: AbortSignal) {
  return (await api.get<User>('/api/auth/me', { signal })).data;
}

export async function signIn(email: string, password: string) {
  return (await api.post<{ token: string; user: User }>('/api/auth/login', { email, password })).data;
}
