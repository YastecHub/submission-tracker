import api from '../../../api/axios';

export interface StudentAccount {
  id: string;
  matricNumber: string;
  email: string;
  fullName: string;
}

export const studentAuthHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function requestStudentRegistrationCode(matricNumber: string, email: string) {
  return (await api.post<{ message: string; expiresInSeconds: number }>('/api/student-auth/register/request-code', { matricNumber, email })).data;
}

export async function registerStudent(matricNumber: string, email: string, code: string, password: string) {
  return (await api.post<{ token: string; student: StudentAccount }>('/api/student-auth/register', { matricNumber, email, code, password })).data;
}

export async function loginStudent(matricNumber: string, password: string) {
  return (await api.post<{ token: string; student: StudentAccount }>('/api/student-auth/login', { matricNumber, password })).data;
}

export interface PasswordResetRequested {
  message: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/** Forgot password: `identifier` is the matric number or the account email. */
export async function requestStudentPasswordReset(identifier: string) {
  return (await api.post<PasswordResetRequested>('/api/student-auth/password-reset/request', { identifier })).data;
}

export async function resetStudentPassword(identifier: string, code: string, password: string) {
  return (await api.post<{ token: string; student: StudentAccount }>('/api/student-auth/password-reset', { identifier, code, password })).data;
}

export async function getStudent(token: string, signal: AbortSignal) {
  return (await api.get<StudentAccount>('/api/student-auth/me', { signal, headers: studentAuthHeader(token) })).data;
}
